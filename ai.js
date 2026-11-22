import { config, replicateModels, replicateTemplates } from "./config.js";

const OPENAI_BASE = "https://api.openai.com/v1";
const REPLICATE_BASE = "https://api.replicate.com/v1";

function requireKey(value, label) {
  if (!value) {
    const error = new Error(`${label} is not configured. Add it to your server .env file and restart.`);
    error.status = 503;
    throw error;
  }
}

async function readJsonResponse(response, provider) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || body?.detail || body?.title || `${provider} request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }
  return body;
}

async function openAiRequest(path, payload, timeoutMs = 120000) {
  requireKey(config.openAiKey, "OPENAI_API_KEY");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${OPENAI_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openAiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    return await readJsonResponse(response, "OpenAI");
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("The AI request timed out. Please try again.");
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function responseText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const pieces = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) pieces.push(content.text);
    }
  }
  return pieces.join("\n").trim();
}

async function createText(prompt, task, imageDataUrl = null) {
  const content = imageDataUrl
    ? [
        { type: "input_text", text: `${task}\n\nUser request: ${prompt}` },
        { type: "input_image", image_url: imageDataUrl }
      ]
    : `${task}\n\nUser request: ${prompt}`;

  const data = await openAiRequest("/responses", {
    model: config.openAiTextModel,
    input: [{ role: "user", content }]
  });
  const text = responseText(data);
  if (!text) throw new Error("The text provider returned an empty result.");
  return { type: "text", text };
}

async function createImage(prompt) {
  requireKey(config.openAiKey, "OPENAI_API_KEY");
  const data = await openAiRequest("/images/generations", {
    model: config.openAiImageModel,
    prompt,
    size: "1024x1024",
    n: 1
  }, 180000);
  const item = data.data?.[0];
  if (item?.b64_json) return { type: "image", dataUrl: `data:image/png;base64,${item.b64_json}` };
  if (item?.url) return { type: "image", url: item.url };
  throw new Error("The image provider did not return an image.");
}

async function createSpeechBinary(prompt) {
  requireKey(config.openAiKey, "OPENAI_API_KEY");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);
  try {
    const response = await fetch(`${OPENAI_BASE}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openAiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.openAiTtsModel,
        voice: config.openAiTtsVoice,
        input: prompt,
        response_format: "mp3"
      }),
      signal: controller.signal
    });
    if (!response.ok) await readJsonResponse(response, "OpenAI");
    const buffer = Buffer.from(await response.arrayBuffer());
    return { type: "audio", dataUrl: `data:audio/mpeg;base64,${buffer.toString("base64")}` };
  } catch (error) {
    if (error.name === "AbortError") {
      const e = new Error("Voice generation timed out. Please try again.");
      e.status = 504;
      throw e;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function replaceTemplate(value, vars) {
  if (typeof value === "string") {
    return value.replace(/\{\{(prompt|image|duration|aspectRatio)\}\}/g, (_, key) => String(vars[key] ?? ""));
  }
  if (Array.isArray(value)) return value.map(item => replaceTemplate(item, vars));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceTemplate(v, vars)]));
  }
  return value;
}

function defaultTemplate(mode, prompt, image, duration, aspectRatio) {
  const common = { prompt };
  if (mode === "text-to-video") return { ...common, duration: Math.min(duration || 5, 10), aspect_ratio: aspectRatio || "16:9" };
  if (mode === "text-to-movie") return { ...common, duration: Math.min(duration || 10, 10), aspect_ratio: aspectRatio || "16:9" };
  if (mode === "image-to-video") return { ...common, image, duration: Math.min(duration || 5, 10) };
  if (mode === "text-to-song") return common;
  if (mode === "image-to-song") return { ...common, image };
  return common;
}

export async function createReplicateJob(mode, { prompt, image, duration, aspectRatio }) {
  requireKey(config.replicateToken, "REPLICATE_API_TOKEN");
  const model = replicateModels[mode];
  if (!model) {
    const error = new Error(`No Replicate model configured for ${mode}. Set the matching REPLICATE_MODEL_* value in .env.`);
    error.status = 503;
    throw error;
  }

  let input = defaultTemplate(mode, prompt, image, duration, aspectRatio);
  const rawTemplate = replicateTemplates[mode];
  if (rawTemplate) {
    try {
      input = replaceTemplate(JSON.parse(rawTemplate), { prompt, image, duration, aspectRatio });
    } catch {
      const error = new Error(`Invalid JSON in the environment input template for ${mode}.`);
      error.status = 500;
      throw error;
    }
  }

  const response = await fetch(`${REPLICATE_BASE}/models/${model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.replicateToken}`,
      "Content-Type": "application/json",
      Prefer: "wait=1"
    },
    body: JSON.stringify({ input })
  });
  const data = await readJsonResponse(response, "Replicate");
  return {
    type: "job",
    job: {
      id: data.id,
      status: data.status,
      urls: data.urls
    }
  };
}

export async function getReplicateJob(id) {
  requireKey(config.replicateToken, "REPLICATE_API_TOKEN");
  const response = await fetch(`${REPLICATE_BASE}/predictions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${config.replicateToken}` }
  });
  const data = await readJsonResponse(response, "Replicate");
  return {
    id: data.id,
    status: data.status,
    output: data.output,
    error: data.error,
    logs: data.logs
  };
}

export async function generate(mode, { prompt, imageDataUrl, duration, aspectRatio }) {
  switch (mode) {
    case "text-to-image":
      return createImage(prompt);
    case "text-to-voice":
      return createSpeechBinary(prompt);
    case "text-to-story":
      return createText(prompt, "Write an original, engaging story. Give it a suitable title and use clear paragraphs.");
    case "image-to-story":
      if (!imageDataUrl) throw Object.assign(new Error("Please upload an image first."), { status: 400 });
      return createText(prompt || "Describe the scene and write a creative story inspired by it.", "Study the supplied image and create an original story inspired by visible details.", imageDataUrl);
    case "ai-editor":
      return createText(prompt, "Edit the user's supplied content. Preserve its meaning, improve clarity and grammar, and return only the improved version unless a short note is essential.");
    case "text-to-video":
    case "text-to-movie":
    case "image-to-video":
    case "text-to-song":
    case "image-to-song":
      if (mode === "image-to-video" || mode === "image-to-song") {
        if (!imageDataUrl) throw Object.assign(new Error("Please upload an image first."), { status: 400 });
      }
      return createReplicateJob(mode, {
        prompt,
        image: imageDataUrl,
        duration,
        aspectRatio
      });
    default:
      throw Object.assign(new Error("Unknown generator selected."), { status: 400 });
  }
}
