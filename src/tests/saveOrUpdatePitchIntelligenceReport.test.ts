import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { PitchIntelligenceReport } from "../models/pitchReport";
import saveOrUpdatePitchIntelligenceReport from "../repositories/savePitchReportTranscript";
import { SessionReportInterface } from "../utils/interface";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await PitchIntelligenceReport.deleteMany({});
});

describe("saveOrUpdatePitchIntelligenceReport", () => {
  const mockLog = {
    question: "What is your business model?",
    answer: "We charge a monthly subscription fee.",
    loggedAt: new Date(),
  };

  it("should create a new pitch report and append log", async () => {
    const report: SessionReportInterface = {
      sessionId: "pitch-123",
      log: mockLog,
    };

    const result = await saveOrUpdatePitchIntelligenceReport(report);

    expect(result).toBe(true);

    const session = await PitchIntelligenceReport.findOne({
      sessionId: report.sessionId,
    });
    expect(session).not.toBeNull();
    expect(session?.logs.length).toBe(1);
    expect(session?.logs[0].question).toBe(mockLog.question);
  });

  it("should append a log to an existing pitch report", async () => {
    const sessionId = "pitch-456";

    await PitchIntelligenceReport.create({
      sessionId,
      logs: [mockLog],
    });

    const newLog = {
      question: "How do you acquire customers?",
      answer: "We use targeted LinkedIn ads.",
      loggedAt: new Date(),
    };

    const report: SessionReportInterface = {
      sessionId,
      log: newLog,
    };

    const result = await saveOrUpdatePitchIntelligenceReport(report);
    expect(result).toBe(true);

    const session = await PitchIntelligenceReport.findOne({ sessionId });
    expect(session?.logs.length).toBe(2);
    expect(session?.logs[1].question).toBe(newLog.question);
  });

  it("should return false if saving fails", async () => {
    const invalidReport = {
      sessionId: "",
      log: { question: "", answer: "", loggedAt: new Date() },
    } as SessionReportInterface;

    const result = await saveOrUpdatePitchIntelligenceReport(invalidReport);
    expect(result).toBe(false);
  });
});
