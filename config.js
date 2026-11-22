import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  openAiKey: process.env.OPENAI_API_KEY || "",
  openAiTextModel: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
  openAiImageModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
  openAiTtsModel: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
  openAiTtsVoice: process.env.OPENAI_TTS_VOICE || "alloy",
  replicateToken: process.env.REPLICATE_API_TOKEN || "",
  corsOrigins: (process.env.CORS_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean)
};

export const replicateModels = {
  "text-to-video": process.env.REPLICATE_MODEL_VIDEO || "",
  "text-to-movie": process.env.REPLICATE_MODEL_MOVIE || "",
  "image-to-video": process.env.REPLICATE_MODEL_IMAGE_VIDEO || "",
  "text-to-song": process.env.REPLICATE_MODEL_SONG || "",
  "image-to-song": process.env.REPLICATE_MODEL_IMAGE_SONG || ""
};

export const replicateTemplates = {
  "text-to-video": process.env.REPLICATE_INPUT_VIDEO,
  "text-to-movie": process.env.REPLICATE_INPUT_MOVIE,
  "image-to-video": process.env.REPLICATE_INPUT_IMAGE_VIDEO,
  "text-to-song": process.env.REPLICATE_INPUT_SONG,
  "image-to-song": process.env.REPLICATE_INPUT_IMAGE_SONG
};
