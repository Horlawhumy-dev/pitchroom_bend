import mongoose, { Schema, Document } from "mongoose";

interface ILog {
  question: string;
  answer: string;
  loggedAt: Date;
}

interface IPitchIntelligenceReport extends Document {
  sessionId: string;
  logs: ILog[];
  pitchIntelligence: any;
}

const pitchIntelligenceReportSchema = new Schema<IPitchIntelligenceReport>({
  sessionId: { type: String, required: true, unique: true },
  logs: [
    {
      question: { type: String, required: true },
      answer: { type: String, required: true },
      loggedAt: { type: Date, default: Date.now },
    },
  ],
  pitchIntelligence: { type: Object, default: null },
});

export const PitchIntelligenceReport = mongoose.model<IPitchIntelligenceReport>(
  "PitchIntelligenceReport",
  pitchIntelligenceReportSchema,
);
