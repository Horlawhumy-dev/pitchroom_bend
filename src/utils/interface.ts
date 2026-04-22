import { Document } from "mongoose";

export enum RequestEnum {
  ANSWER = "answer",
  PING = "ping",
  SAVE = "save",
  TRANSCRIBE = "transcription",
}

export enum settingsTypeEnum {
  COACHING = "coaching",
  INTERROGATION = "interrogation",
  PRACTICE = "practice",
}

export interface IPitchSession extends Document {
  sessionId: string;
  uid: string;
  pitchStage: string;
  businessContext: string;
  deckPath: string;
  isActive: boolean;
  createdAt: Date;
  duration?: string;
}

export interface IPitchIntelligenceReport extends Document {
  sessionId: string;
  logs: {
    question: string;
    answer: string;
    loggedAt: Date;
  }[];
  pitchIntelligence: any;
}

export interface SessionReportInterface {
  sessionId: string;
  log: {
    question: string;
    answer: string;
    loggedAt: Date;
  };
}

export type InsightAIResponseType = {
  storyClarity: { score: number; feedback: string };
  marketCredibility: { score: number; feedback: string };
  founderConfidence: { score: number; feedback: string };
  competitiveAdvantage: { score: number; feedback: string };
  businessModel: { score: number; feedback: string };
  tractionEvidence: { score: number; feedback: string };
  investorRiskSignals: string[];
  overallSummary: string;
  actionableSteps: string[];
};

export default interface SessionObjType {
  sessionId: string;
  responseType: string;
  businessContext: string;
  deckContent: string;
  pitchStage: string;
  userData: {
    email: string;
    uid: string;
  };
}
