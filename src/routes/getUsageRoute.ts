import { Router, Request, Response } from "express";
import { authenticateUserToken, ensureOnboardingCompleted } from "../middleware/authenticate";
import logger from "../utils/logger";
import getProductUsages from "../repositories/getProductUsage";
import { handleSuccess, handleError } from "../utils/responseHandler";

const router = Router();
/**
 * @swagger
 * /api/v1/pitch/stats:
 *   get:
 *     summary: Get Pitch Simulator session usage statistics.
 *     description: Returns basic usage statistics for pitch sessions.
 *     tags:
 *       - Founders
 *     security:
 *       - BearerAuth: []
 */

router.get(
  "/stats",
  authenticateUserToken,
  ensureOnboardingCompleted,
  async (req: Request, res: Response): Promise<void> => {
    //@ts-ignore
    const user = req.user;
    const userData = {
      email: user.email,
      uid: user.uid,
    };

    try {
      // Calculate start of current month
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const sessionsCount = await getProductUsages(
        userData.uid,
        startDate,
        endDate,
      );

      const responseData = {
        usage: {
          creditsUsed: sessionsCount.success ? sessionsCount.count : 0,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      };

      handleSuccess(res, "Pitch Simulator usage stats fetched successfully", responseData);
    } catch (error) {
      logger.error("Error fetching pitch usage stats:", error);
      handleError(res, "Failed to fetch usage stats", {
        usage: {
          creditsUsed: 0,
          startDate: "",
          endDate: "",
        },
      }, 500);
    }
  },
);

export default router;
