# AI Video Generator Studio

A starter full-stack project with a responsive creative studio UI, Firebase Google sign-in, an Express backend, protected generation endpoints, upload validation, rate limiting, and asynchronous job polling.

## Features in the UI
- Google sign-in/sign-out (Firebase Authentication)
- Short video (90–300 seconds), long video (300–1,800 seconds), movie (1,800–7,200 seconds)
- Realistic, anime, cartoon, cinematic, 3D and documentary style options
- Character presets and custom character description
- Text-to-video, text-to-image, text-to-voice, text-to-story, text-to-song
- Image-to-video, image-to-story, image-to-song and AI editing interface
- Resolution, aspect ratio, language, narration and music options
- Generation progress, result preview and download link

## Important: connect an actual AI provider
This repository does not include a proprietary video/image/music model and does not promise unlimited free generation. The backend uses a generic provider adapter. Configure a provider endpoint that implements the contract below. Provider pricing, supported durations, formats and quotas apply.

### Provider contract
`POST AI_PROVIDER_URL` with `Authorization: Bearer AI_PROVIDER_API_KEY` and JSON body containing `type`, prompt, settings and optional `sourceFile` (`name`, `mimeType`, `base64`). Return either:
- `{ "jobId": "provider-job-id" }` for an asynchronous task, or
- `{ "url": "https://..." }` / `{ "videoUrl": "..." }` / `{ "imageUrl": "..." }` / `{ "audioUrl": "..." }` / `{ "text": "..." }` for a completed result.

For asynchronous jobs, implement `GET AI_PROVIDER_URL/jobs/:jobId` and return `{ "status": "queued|processing|completed|failed", "progress": 0-100, ...resultFields }`.

Different AI vendors use different APIs. Adapt `backend/server.js` to the provider's documented request and response schema before production use.

## Setup
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and configure Firebase Admin credentials and your AI provider endpoint/key.
4. In Firebase Console, create a Web App and enable Google under Authentication → Sign-in method. Add the web config to `public/index.html`.
5. Add the same Firebase project service account to the server using `GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json` or `FIREBASE_SERVICE_ACCOUNT_JSON`.
6. Set `AI_PROVIDER_URL` and `AI_PROVIDER_API_KEY` in `.env`. Never put the provider key in browser code or commit `.env`.
7. Run `npm start`, then open `http://localhost:3000`.

## Deploy
Deploy the Node server to a host that supports Node.js and persistent/background jobs. For production, use object storage for uploads/results, a durable job queue/database instead of the in-memory job map, HTTPS, strict CORS origins, per-user quotas, provider webhook verification, and appropriate content moderation. Do not use GitHub Pages alone for this backend; it only hosts static files.

## API
- `GET /api/health` — configuration status.
- `POST /api/generate` — authenticated multipart generation request.
- `GET /api/jobs/:id` — authenticated job status (only the owner can read it).
