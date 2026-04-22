import { Router, Request, Response } from "express";
import { authenticateUserToken, ensureOnboardingCompleted } from "../middleware/authenticate";
import { PitchSession } from "../models/pitchSession";
import { PitchIntelligenceReport } from "../models/pitchReport";
import logger from "../utils/logger";
import { handleSuccess, handleError } from "../utils/responseHandler";

const router = Router();

/**
 * @swagger
 * /api/v1/sessions/user-stats:
 *   get:
 *     summary: Get aggregated user pitch statistics.
 *     description: Returns total sessions, average score, and pitch readiness for the founder.
 *     tags:
 *       - Founders
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/user-stats",
  authenticateUserToken,
  ensureOnboardingCompleted,
  async (req: Request, res: Response): Promise<void> => {
    try {
      //@ts-ignore
      const userId = req.user.uid;

      // 1. Fetch all finished sessions for the user
      const finishedSessions = await PitchSession.find({
        uid: userId,
        isActive: false
      }).sort({ createdAt: -1 }).lean();

      if (!finishedSessions || finishedSessions.length === 0) {
        handleSuccess(res, "No sessions found for user", {
          totalSessions: 0,
          averageScore: 0,
          pitchReadiness: 0,
          lastSession: null
        });
        return;
      }

      // 2. Fetch reports for these sessions to get scores
      const sessionIds = finishedSessions.map(s => s.sessionId);
      const reports = await PitchIntelligenceReport.find({
        sessionId: { $in: sessionIds }
      }).lean();

      // 3. Calculate Average Score
      let totalOverallScore = 0;
      let sessionsWithScores = 0;

      reports.forEach(report => {
        if (report.pitchIntelligence) {
          const { storyClarity, marketCredibility, founderConfidence } = report.pitchIntelligence;
          const avg = ( (storyClarity?.score || 0) + (marketCredibility?.score || 0) + (founderConfidence?.score || 0) ) / 3;
          if (avg > 0) {
            totalOverallScore += avg;
            sessionsWithScores++;
          }
        }
      });

      const averageScore = sessionsWithScores > 0 
        ? parseFloat((totalOverallScore / sessionsWithScores).toFixed(1)) 
        : 0;

      // 4. Calculate Pitch Readiness (out of 100)
      const pitchReadiness = Math.round((averageScore / 10) * 100);

      // 5. Get Last Session Score
      const latestSessionId = finishedSessions[0].sessionId;
      const latestReport = reports.find(r => r.sessionId === latestSessionId);
      let lastSessionScore = 0;
      if (latestReport?.pitchIntelligence) {
        const { storyClarity, marketCredibility, founderConfidence } = latestReport.pitchIntelligence;
        lastSessionScore = parseFloat((( (storyClarity?.score || 0) + (marketCredibility?.score || 0) + (founderConfidence?.score || 0) ) / 3).toFixed(1));
      }

      const responseData = {
        totalSessions: finishedSessions.length,
        averageScore,
        pitchReadiness,
        lastSession: {
          sessionId: latestSessionId,
          score: lastSessionScore,
          date: finishedSessions[0].createdAt
        }
      };

      handleSuccess(res, "User stats retrieved successfully", responseData);
    } catch (error: any) {
      logger.error("Error fetching user stats:", error.message);
      handleError(res, "Failed to retrieve user statistics", null, 500);
    }
  }
);

export default router;
