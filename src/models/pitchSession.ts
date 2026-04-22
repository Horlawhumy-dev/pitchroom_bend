import mongoose, { Schema, Document } from "mongoose";

interface IPitchSession extends Document {
  sessionId: string;
  uid: string;
  pitchStage: string;
  businessContext: string;
  deckPath: string;
  isActive: boolean;
  responseType: string;
  createdAt: Date;
  duration?: string;
}

const pitchSessionSchema = new Schema<IPitchSession>({
  sessionId: { type: String, required: true, unique: true },
  uid: { type: String, required: true },
  pitchStage: { type: String, default: "Pre-Seed" },
  businessContext: { type: String, default: "" },
  deckPath: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
  responseType: { type: String, default: "practice" },
  createdAt: { type: Date, default: Date.now },
  duration: { type: String, default: "" },
});

export const PitchSession = mongoose.model<IPitchSession>(
  "PitchSession",
  pitchSessionSchema,
);
