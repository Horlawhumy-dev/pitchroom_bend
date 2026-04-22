import { PitchIntelligenceReport } from "../models/pitchReport";
import { generatePitchIntelligenceFromAI } from "../utils/generatePitchIntelligenceFromAI";
import Logger from "../utils/logger";
import { PitchSession } from "../models/pitchSession";

/**
 * Generate Pitch Intelligence Report with insights
 *
 * @param {string} sessionId - The session ID to generate transcripts for.
 * @returns {Promise<any>} - The session report with insights.
 */
const generatePitchTranscriptsWithInsights = async (
  sessionId: string,
): Promise<any> => {
  try {
    // 1. Fetch transcript from DB
    const sessionTranscript = await PitchIntelligenceReport.findOne({
      sessionId,
    }).lean();

    if (!sessionTranscript) {
      Logger.error(`Pitch transcript not found for session: ${sessionId}`);
      return {
        error: "Pitch transcript not found.",
        statusCode: 404,
      };
    }

    // Return existing insights if already generated
    if (sessionTranscript.pitchIntelligence) {
      return {
        message: "Pitch Intelligence Report retrieved successfully.",
        data: {
          sessionTranscript,
          pitchIntelligence: sessionTranscript.pitchIntelligence,
        },
        statusCode: 200,
      };
    }

    // 2. Fetch session details (for pitchStage)
    const sessionDetails = await PitchSession.findOne({ sessionId }).lean();
    const pitchStage = sessionDetails?.pitchStage || "Seed";

    // 3. Generate AI insights (Pitch Intelligence)
    Logger.info(`Generating Pitch Intelligence for session: ${sessionId}`);
    const insights = await generatePitchIntelligenceFromAI(
      sessionId,
      sessionTranscript.logs,
      pitchStage,
    );

    if (!insights) {
      throw new Error("Failed to generate AI insights.");
    }

    // 4. Save insights back to Report
    await PitchIntelligenceReport.findOneAndUpdate(
      { sessionId },
      { $set: { pitchIntelligence: insights } },
      { new: true },
    );

    return {
      message: "Pitch Intelligence Report generated successfully.",
      data: {
        sessionTranscript,
        pitchIntelligence: insights,
      },
      statusCode: 200,
    };
  } catch (error: any) {
    Logger.error("Error generating pitch transcripts with insights:", error.message);
    return {
      error: "Failed to generate pitch intelligence report.",
      statusCode: 500,
    };
  }
};

export default generatePitchTranscriptsWithInsights;
