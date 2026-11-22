import express from "express";
import helmet from "helmet";
import multer from "multer";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, replicateModels } from "./config.js";
import { generate, getReplicateJob } from "./ai.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.disable("x-powered-by");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      mediaSrc: ["'self'", "data:", "blob:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: "1mb" }));

if (config.corsOrigins.length) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
}

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a minute and try again." }
});
app.use("/api", apiLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.mimetype)) {
      return callback(new Error("Only PNG, JPG and WEBP images are supported."));
    }
    callback(null, true);
  }
});

app.get("/api/health", (_req, res) => {
  const openAiReady = Boolean(config.openAiKey);
  const replicateReady = Boolean(config.replicateToken);
  const generators = {
    "text-to-image": openAiReady,
    "text-to-voice": openAiReady,
    "text-to-story": openAiReady,
    "image-to-story": openAiReady,
    "ai-editor": openAiReady,
    "text-to-video": replicateReady && Boolean(replicateModels["text-to-video"]),
    "text-to-movie": replicateReady && Boolean(replicateModels["text-to-movie"]),
    "image-to-video": replicateReady && Boolean(replicateModels["image-to-video"]),
    "text-to-song": replicateReady && Boolean(replicateModels["text-to-song"]),
    "image-to-song": replicateReady && Boolean(replicateModels["image-to-song"])
  };
  const readyCount = Object.values(generators).filter(Boolean).length;
  res.json({
    ok: true,
    service: "AI Creator Studio API",
    providers: { openai: openAiReady, replicate: replicateReady },
    generators,
    readyCount,
    totalGenerators: Object.keys(generators).length,
    allReady: readyCount === Object.keys(generators).length
  });
});

app.post("/api/generate", upload.single("image"), async (req, res, next) => {
  try {
    const mode = String(req.body.mode || "");
    const prompt = String(req.body.prompt || "").trim();
    const duration = Math.max(1, Math.min(Number(req.body.duration || 5), 10));
    const aspectRatio = ["16:9", "9:16", "1:1"].includes(req.body.aspectRatio) ? req.body.aspectRatio : "16:9";

    if (!mode) return res.status(400).json({ error: "Choose a generator." });
    if (prompt.length > 5000) return res.status(400).json({ error: "Prompt must be 5,000 characters or fewer." });
    if (mode !== "image-to-story" && !prompt) return res.status(400).json({ error: "Please enter a prompt." });

    const imageDataUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : null;

    const result = await generate(mode, { prompt, imageDataUrl, duration, aspectRatio });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/jobs/:id", async (req, res, next) => {
  try {
    if (!/^[a-zA-Z0-9_-]{5,100}$/.test(req.params.id)) {
      return res.status(400).json({ error: "Invalid job ID." });
    }
    const job = await getReplicateJob(req.params.id);
    res.json(job);
  } catch (error) {
    next(error);
  }
});

app.use(express.static(path.join(__dirname, "../public")));

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE" ? "Image must be 10 MB or smaller." : error.message;
    return res.status(400).json({ error: message });
  }
  const status = Number(error.status) || 500;
  if (status >= 500 && config.nodeEnv !== "development") {
    console.error(error.message);
  } else {
    console.error(error);
  }
  res.status(status).json({
    error: status >= 500 && config.nodeEnv !== "development"
      ? "The generation service could not complete the request. Check server configuration and try again."
      : error.message || "Something went wrong."
  });
});

app.listen(config.port, () => {
  console.log(`AI Creator Studio running at http://localhost:${config.port}`);
});
