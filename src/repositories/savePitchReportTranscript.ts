import Logger from "../utils/logger";
import { PitchIntelligenceReport } from "../models/pitchReport";
import { SessionReportInterface } from "../utils/interface";

/**
 * Save or update a session by sessionId.
 * Always appends the new question-answer log to the session.
 * Creates a new session if it doesn't exist.
 *
 * @param {SessionReportInterface} report - The sessionId and log (question, answer, loggedAt).
 * @returns {Promise<boolean>} - True if saved/updated successfully, false otherwise.
 */
async function saveOrUpdatePitchIntelligenceReport(
  report: SessionReportInterface,
): Promise<boolean> {
  const { sessionId, log } = report;

  try {
    const updatedReport = await PitchIntelligenceReport.findOneAndUpdate(
      { sessionId },
      {
        $push: { logs: log },
      },
      { upsert: true, new: true },
    );

    if (updatedReport) {
      Logger.info(`Pitch intelligence report updated for session: ${sessionId}`);
      return true;
    }
    return false;
  } catch (error: any) {
    Logger.error(`Error saving pitch report: ${error.message}`, {
      error,
    });
    return false;
  }
}

export default saveOrUpdatePitchIntelligenceReport;
