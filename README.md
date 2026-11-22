# AI Creator Studio — Node.js Backend

A responsive AI creation dashboard with a Node.js/Express backend. It includes:
- Text to Video
- Text to Movie
- Text to Image
- Text to Voice
- Text to Story
- Text to Song
- Image to Video
- Image to Story
- Image to Song
- AI Editor

## Important: provider setup is required

This project includes working API integration code, but it does **not** include paid AI API keys or model subscriptions. Actual generation only works after you configure your own provider credentials and compatible model IDs. API keys stay on the server in `.env`; do not add them to `public/app.js` or commit `.env` to GitHub.

### Providers used

- **OpenAI API**: text/story/editor, image generation, text-to-speech.
- **Replicate API**: video/movie, image-to-video and music generation. Choose a model for each tool and configure its input template to match that model's documented schema.

The Replicate model schemas differ. The `.env.example` templates are starter examples, not a guarantee that every model accepts the same fields. Check the selected model's input schema in Replicate and adjust the matching `REPLICATE_INPUT_*` JSON.

## Requirements

- Node.js 20 or newer
- OpenAI API key for OpenAI-powered tools
- Replicate API token and compatible model slugs for video/music tools

## Run locally

1. Extract the ZIP.
2. Open a terminal in the `AI_Creator_Studio_Node` folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env`.
   - Windows PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`

5. Add your provider credentials and model configuration to `.env`.
6. Start the server:

   ```bash
   npm start
   ```

7. Open `http://localhost:3000`.

For development with auto-restart:

```bash
npm run dev
```

## API endpoints

### `GET /api/health`
Returns backend status.

### `POST /api/generate`
Multipart form fields:
- `mode`: one of the generator IDs listed above
- `prompt`: text prompt
- `image`: optional PNG/JPG/WEBP image (required for image-to-video, image-to-story and image-to-song)
- `duration`: optional 5 or 10 seconds for video models
- `aspectRatio`: `16:9`, `9:16` or `1:1`

The server returns text, image/audio data, or a Replicate job ID.

### `GET /api/jobs/:id`
Checks the status of a Replicate generation job.

## Configure the providers

### OpenAI
Set:
- `OPENAI_API_KEY`
- optionally `OPENAI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`

OpenAI-powered tools:
- Text to Image
- Text to Voice
- Text to Story
- Image to Story
- AI Editor

### Replicate
Set:
- `REPLICATE_API_TOKEN`
- `REPLICATE_MODEL_VIDEO`
- `REPLICATE_MODEL_MOVIE`
- `REPLICATE_MODEL_IMAGE_VIDEO`
- `REPLICATE_MODEL_SONG`
- `REPLICATE_MODEL_IMAGE_SONG`

Each model value should be a Replicate model slug in `owner/name` form. Adjust the `REPLICATE_INPUT_*` JSON templates so their keys match the model's input schema. Supported placeholders: `{{prompt}}`, `{{image}}`, `{{duration}}`, `{{aspectRatio}}`.

## Security notes

- Never expose provider API keys to browser code.
- `.env` is ignored by Git.
- Uploads are limited to 10 MB and PNG/JPG/WEBP.
- API requests are rate-limited.
- Use HTTPS in production.
- Add user authentication, per-user quotas and persistent storage before offering this publicly.
- Do not expose this development server directly to the public internet without production hardening.

## Known limitations

- “Text to Movie” generates a short clip according to the selected model's maximum duration; it is not a full-length feature-film editor.
- Video and music generation are asynchronous and depend on the selected Replicate model.
- This starter project does not include user accounts, payment handling, or permanent cloud storage.
- Generated media links may expire depending on the provider. Download important results promptly.
