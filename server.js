import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import admin from 'firebase-admin';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const app = express();
const PORT = Number(process.env.PORT || 3000);
const jobs = new Map();

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
const origins = (process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(root, 'public')));
app.use(rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));

// Firebase Admin is optional for local UI preview, but required for protected production APIs.
let firebaseReady = false;
try {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
  }
  firebaseReady = admin.apps.length > 0;
} catch (error) {
  console.error('Firebase Admin initialization failed:', error.message);
}

async function requireUser(req, res, next) {
  if (!firebaseReady) return res.status(503).json({ error: 'Firebase Admin is not configured. Add service-account credentials to the server environment.' });
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Sign in is required.' });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Your sign-in token is invalid or expired.' });
  }
}

const allowedTypes = ['video','image','voice','story','song','imagevideo','imagestory','imagesong','editor'];
const schema = z.object({
  type: z.enum(allowedTypes),
  prompt: z.string().max(6000).default(''),
  videoType: z.enum(['short','long','movie']).optional(),
  duration: z.coerce.number().int().min(90).max(7200).optional(),
  style: z.string().max(60).optional(), quality: z.string().max(40).optional(),
  ratio: z.string().max(20).optional(), language: z.string().max(40).optional(),
  character: z.string().max(80).optional(), voice: z.string().max(60).optional(),
  music: z.string().max(60).optional(),
  storyType: z.string().max(60).optional(), songStyle: z.string().max(60).optional(),
  voiceType: z.string().max(60).optional()
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.max(1, Number(process.env.MAX_UPLOAD_MB || 20)) * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = /^(image\/(png|jpeg|webp)|video\/(mp4|webm|quicktime)|audio\/(mpeg|wav|mp4|webm))$/.test(file.mimetype);
    cb(ok ? null : new Error('Unsupported file type. Upload an image, video, or audio file.'), ok);
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, firebaseConfigured: firebaseReady, aiProviderConfigured: Boolean(process.env.AI_PROVIDER_URL && process.env.AI_PROVIDER_API_KEY) }));

app.post('/api/generate', requireUser, upload.single('file'), async (req, res) => {
  const parsed = schema.safeParse({ ...req.body, type: req.body.type });
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request.', details: parsed.error.flatten() });
  const input = parsed.data;
  if (!input.prompt.trim() && !req.file) return res.status(400).json({ error: 'Add a prompt or upload a source file.' });
  if (input.type === 'video') {
    const d = input.duration || 90;
    const valid = input.videoType === 'short' ? d >= 90 && d <= 300 : input.videoType === 'long' ? d >= 300 && d <= 1800 : d >= 1800 && d <= 7200;
    if (!valid) return res.status(400).json({ error: 'Duration does not match the selected video category.' });
  }
  if (!process.env.AI_PROVIDER_URL || !process.env.AI_PROVIDER_API_KEY) {
    return res.status(503).json({ error: 'AI provider is not connected yet. Configure AI_PROVIDER_URL and AI_PROVIDER_API_KEY on the server. The interface and login can work independently.' });
  }

  // Provider adapter contract: your AI service must accept JSON metadata and optional base64 source file,
  // then return either { jobId } for async work or { url } / { text } for completed output.
  const payload = {
    ...input,
    userId: req.user.uid,
    sourceFile: req.file ? { name: req.file.originalname, mimeType: req.file.mimetype, base64: req.file.buffer.toString('base64') } : null
  };
  try {
    const providerResponse = await fetch(process.env.AI_PROVIDER_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${process.env.AI_PROVIDER_API_KEY}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000)
    });
    const data = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok) return res.status(providerResponse.status >= 500 ? 502 : providerResponse.status).json({ error: data.error || 'AI provider rejected the request.' });
    if (data.jobId) {
      jobs.set(String(data.jobId), { userId: req.user.uid, providerJobId: String(data.jobId), createdAt: Date.now() });
      return res.status(202).json({ jobId: String(data.jobId), status: 'queued' });
    }
    if (data.url || data.videoUrl || data.imageUrl || data.audioUrl || data.text) return res.json(data);
    return res.status(502).json({ error: 'Provider response must include jobId, url, videoUrl, imageUrl, audioUrl, or text.' });
  } catch (error) {
    console.error('AI provider request failed:', error.message);
    return res.status(502).json({ error: 'Could not reach the AI provider. Check server configuration and provider status.' });
  }
});

app.get('/api/jobs/:id', requireUser, async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || job.userId !== req.user.uid) return res.status(404).json({ error: 'Job not found.' });
  if (!process.env.AI_PROVIDER_URL || !process.env.AI_PROVIDER_API_KEY) return res.status(503).json({ error: 'AI provider is not configured.' });
  try {
    const url = `${process.env.AI_PROVIDER_URL.replace(/\/$/, '')}/jobs/${encodeURIComponent(job.providerJobId)}`;
    const response = await fetch(url, { headers: { authorization: `Bearer ${process.env.AI_PROVIDER_API_KEY}` }, signal: AbortSignal.timeout(20_000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ error: 'Could not retrieve provider job status.' });
    if (data.status === 'completed' || data.status === 'failed') jobs.delete(req.params.id);
    res.json(data);
  } catch {
    res.status(502).json({ error: 'Provider job status request failed.' });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file is too large.' : err.message });
  res.status(400).json({ error: err.message || 'Bad request.' });
});

app.get('*', (_req, res) => res.sendFile(path.join(root, 'public', 'index.html')));
app.listen(PORT, () => console.log(`AI Video Generator running at http://localhost:${PORT}`));
