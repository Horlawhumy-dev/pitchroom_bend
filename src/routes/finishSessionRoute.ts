import { Router, Request, Response } from "express";
import { PitchSession } from "../models/pitchSession";
import { PitchIntelligenceReport } from "../models/pitchReport";
import { generatePitchIntelligenceFromAI } from "../utils/generatePitchIntelligenceFromAI";
import deactivateSession from "../repositories/deactivateSession";
import logger from "../utils/logger";
import { authenticateUserToken, ensureOnboardingCompleted } from "../middleware/authenticate";
import redisClient from "../config/redis";
import { handleSuccess, handleError } from "../utils/responseHandler";

const router = Router();

/**
 * @swagger
 * /api/v1/finish:
 *   post:
 *     summary: Finish a pitch session and trigger analysis.
 *     description: Ends an active session, gathers the transcript, and triggers the AI analyst to generate a report.
 *     tags:
 *       - Founders
 *     security:
 *       - BearerAuth: []
 */
router.post(
  "/",
  authenticateUserToken,
  ensureOnboardingCompleted,
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.body;
    if (!sessionId) {
      handleError(res, "Session ID is required", null, 400);
      return;
    }

    try {
      // 1. Get the session details
      const session = await PitchSession.findOne({ sessionId });
      if (!session) {
        handleError(res, "Session not found", null, 404);
        return;
      }

      if (!session.isActive) {
        handleError(res, "Session is already finished", null, 400);
        return;
      }

      logger.info(`Finishing session ${sessionId} and starting analysis...`);

      // 2. Fetch the transcript logs
      const reportDoc = await PitchIntelligenceReport.findOne({ sessionId });
      const logs = reportDoc?.logs || [];

      // 3. Trigger AI Intelligence generation if logs exist
      if (logs.length > 0) {
        const intelligence = await generatePitchIntelligenceFromAI(
          sessionId,
          logs,
          session.pitchStage
        );

        if (intelligence) {
          // Update the report document with analysis
          await PitchIntelligenceReport.findOneAndUpdate(
            { sessionId },
            { pitchIntelligence: intelligence }
          );
          logger.info(`AI Intelligence analysis complete for session ${sessionId}`);
        }
      } else {
          logger.warn(`No logs found for session ${sessionId}, skipping AI analysis.`);
      }

      // 4. Deactivate session
      await deactivateSession(sessionId);

      // 5. Clean cache
      try {
        await redisClient.del(sessionId);
      } catch (e) {
        logger.error(`Error clearing session cache: ${e}`);
      }

      handleSuccess(res, "Session finished and analyzed successfully", {
        sessionId,
        status: "analyzed"
      });
    } catch (error: any) {
      logger.error(`Error finishing session ${sessionId}: ${error.message}`);
      handleError(res, error.message, null, 500);
    }
  }
);

export default router;
