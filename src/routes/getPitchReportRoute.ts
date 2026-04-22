import { Router, Request, Response } from "express";
import { authenticateUserToken, ensureOnboardingCompleted } from "../middleware/authenticate";
import logger from "../utils/logger";
import generatePitchIntelligence from "../repositories/generatePitchIntelligence";
import { handleSuccess, handleError } from "../utils/responseHandler";

const router = Router();

/**
 * @swagger
 * /api/v1/pitch/report/{sessionId}:
 *   get:
 *     summary: Get Pitch Intelligence Report
 *     description: Returns the pitch transcript and AI-generated intelligence report (scores/risks).
 *     tags:
 *       - Founders
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         description: The unique ID of the session to retrieve the report for.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pitch report retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pitch Intelligence Report generated successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionTranscript:
 *                       type: object
 *                     pitchIntelligence:
 *                       type: object
 *                       properties:
 *                         storyClarity:
 *                           type: object
 *                         marketCredibility:
 *                           type: object
 *                         founderConfidence:
 *                           type: object
 *                         investorRiskSignals:
 *                           type: array
 *                           items:
 *                             type: string
 *                         overallSummary:
 *                           type: string
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 */

router.get(
  "/report/:sessionId",
  authenticateUserToken,
  ensureOnboardingCompleted,
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;

    if (!sessionId) {
      handleError(res, "Session ID is required.", null, 400);
      return;
    }

    try {
      const sessionReport =
        await generatePitchIntelligence(sessionId);

      if (sessionReport.error) {
        handleError(res, sessionReport.error, null, sessionReport.statusCode);
        return;
      }

      handleSuccess(res, sessionReport.message, sessionReport.data, sessionReport.statusCode);
    } catch (error: any) {
      logger.error("Error retrieving pitch report:", error.message);
      handleError(res, "Failed to retrieve pitch intelligence report.", null, 500);
    }
  },
);

export default router;
