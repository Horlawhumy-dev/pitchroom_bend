import * as dotenv from "dotenv";

dotenv.config();

const configs = {
  PORT: process.env.PORT || 3000,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  WHISPER_MODEL: process.env.WHISPER_MODEL || "Xenova/whisper-small",
  ENV: process.env.ENV || "dev",
  JWT_SECRET: process.env.JWT_SECRET || "",
  REDIS_URL: process.env.REDIS_URL || "",
  REDIS_USERNAME: process.env.REDIS_USERNAME || "",
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
  REDIS_HOST: process.env.REDIS_HOST || "",
  DB_HOST: process.env.DB_HOST || "",
  DB_USERNAME: process.env.DB_USERNAME || "",
  DB_PASSWORD: process.env.DB_PASSWORD || "",
  DB_NAME: process.env.DB_NAME || "",
  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_SES_REGION_NAME: process.env.AWS_SES_REGION_NAME || "",
  S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || "",
  SERVER_URL: process.env.SERVER_URL || "",
  MONGO_URI: process.env.MONGO_URI || "",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "*",

  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgUe936bV4B1", // Default professional voice
  EMAIL_SENDER: process.env.EMAIL_SENDER,
  FRONTEND_URL: process.env.FRONTEND_URL,
  UPLOADS_DIR: process.env.UPLOADS_DIR || "uploads",
  HF_TTS_MODEL: process.env.HF_TTS_MODEL || "Xenova/speecht5_tts",
  HF_TTS_DTYPE: process.env.HF_TTS_DTYPE || "fp32",
  HF_SPEAKER_EMBEDDINGS: process.env.HF_SPEAKER_EMBEDDINGS || "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin",
};

if (!configs.MONGO_URI) {
  if (configs.ENV.toLowerCase() !== "local") {
    configs.MONGO_URI = `mongodb+srv://${configs.DB_USERNAME}:${configs.DB_PASSWORD}@${configs.DB_HOST}/${configs.DB_NAME}?retryWrites=true&w=majority`;
  } else {
    configs.MONGO_URI = `mongodb://localhost:27017/pitch-simulator`;
  }
}

export default configs;
