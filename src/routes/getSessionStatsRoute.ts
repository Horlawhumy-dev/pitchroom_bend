import { Router, Request, Response } from "express";
import { authenticateAdminToken } from "../middleware/authenticateAdmin";
import getPitchSessionStatistics from "../repositories/getSessionStatsWithPercentage";
import logger from "../utils/logger";
import { handleSuccess, handleError } from "../utils/responseHandler";

const router = Router();

/**
 * @swagger
 * /ms-get-usage-metrics/admin/pitch-stats:
 *   get:
 *     summary: Get pitch simulator session statistics.
 *     description: Returns total number of pitch sessions, active sessions, and inactive sessions.
 *     tags:
 *       - Admins
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/admin/pitch-stats",
  authenticateAdminToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid } = req.query;

      const stats = await getPitchSessionStatistics(
        uid as string | undefined,
      );

      logger.info(
        "Pitch session statistics fetched successfully",
      );

      handleSuccess(res, "Pitch session statistics fetched successfully", stats);
    } catch (error) {
      logger.error("Error fetching pitch session statistics:", error);
      handleError(res, "Failed to fetch pitch session statistics", {
        total: 0, totalActiveSessions: 0, totalInactiveSessions: 0
      }, 400);
    }
  },
);

export default router;
