# AI Creator Studio — Complete Node.js API-connected project

This project contains the frontend and a Node.js/Express backend for 10 AI tools:
Text to Video, Text to Movie, Text to Image, Text to Voice, Text to Story,
Text to Song, Image to Video, Image to Story, Image to Song, and AI Editor.

## Important: API credentials are not included

A ZIP cannot safely contain someone else's private API keys. This project is wired to call the providers from the backend, but you must add your own provider credentials to `.env`. The `.env.example` contains blank placeholders, not working keys. Never send keys in chat or put them in `public/` files or GitHub.

Provider coverage:
- OpenAI: text/story/editor, image generation, text-to-speech.
- Replicate: video and music generation. Each selected model must be accessible to your account.

## Setup (Windows / VS Code)

1. Extract the ZIP.
2. Open the `AI_Creator_Studio_Node` folder in VS Code.
3. Install Node.js 20 or newer.
4. Open Terminal in that folder and run:

   ```powershell
   npm install
   Copy-Item .env.example .env
   ```

5. Open `.env` locally. Add your OpenAI key and Replicate token. Add the exact Replicate model slugs you selected.
6. In the Replicate model page, inspect its **Input** schema and make the matching `REPLICATE_INPUT_*` JSON template match the exact field names and accepted values. The examples are not universal.
7. Run:

   ```powershell
   npm start
   ```

8. Open **http://localhost:3000**. Do not open `public/index.html` directly as a file.
9. Visit **http://localhost:3000/api/health** to check whether the server sees the provider credentials. This endpoint never returns the secret values.

## Which tools need which provider?

| Tool | Provider |
|---|---|
| Text to Image | OpenAI |
| Text to Voice | OpenAI |
| Text to Story | OpenAI |
| Image to Story | OpenAI |
| AI Editor | OpenAI |
| Text to Video | Replicate + video model |
| Text to Movie | Replicate + video model |
| Image to Video | Replicate + image-to-video model |
| Text to Song | Replicate + music model |
| Image to Song | Replicate + image/music model |

## Common "Generate request failed" causes

- `OPENAI_API_KEY is not configured`: add the key to `.env`, save, restart `npm start`.
- `REPLICATE_API_TOKEN is not configured`: add the Replicate token, save, restart.
- `No Replicate model configured`: set the matching `REPLICATE_MODEL_*` variable.
- Invalid input / model validation: adapt the JSON template to the model's exact input schema.
- 401 / 403 from provider: key/token invalid, account lacks access, or model unavailable.
- 429: provider quota/rate limit or billing limit.
- Backend offline: run `npm start` and open the localhost URL above.

## Security

- Credentials are read only by Node.js from `.env`.
- `.env` is excluded by `.gitignore`.
- Do not publish `.env`, API tokens, or screenshots that show tokens.
- This is a development starter. Before public launch, add authentication, per-user quotas, abuse prevention, durable job storage, HTTPS, and production deployment hardening.

## Notes

- Video and music jobs are asynchronous.
- Text-to-Movie creates short generated clips according to the selected model's limits; it is not a full-length film editor.
- API usage may cost money. Ask a parent/guardian to help review provider accounts and billing.
