import * as dotenv from "dotenv";

dotenv.config();

const configs = {
  PORT: process.env.PORT || 3000,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY, // retained for audio transcription
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
  OPENAI_TRANSCRIBE_MODEL: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe",
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgUe936bV4B1", // Default professional voice
  EMAIL_SENDER: process.env.EMAIL_SENDER,
  FRONTEND_URL: process.env.FRONTEND_URL,
};

if (!configs.MONGO_URI) {
  if (configs.ENV.toLowerCase() !== "local") {
    configs.MONGO_URI = `mongodb+srv://${configs.DB_USERNAME}:${configs.DB_PASSWORD}@${configs.DB_HOST}/${configs.DB_NAME}?retryWrites=true&w=majority`;
  } else {
    configs.MONGO_URI = `mongodb://localhost:27017/pitch-simulator`;
  }
}

export default configs;
