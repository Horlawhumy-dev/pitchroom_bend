import { Router, Request, Response } from "express";
import { authenticateUserToken, ensureOnboardingCompleted } from "../middleware/authenticate";
import redisClient from "../config/redis";
import getPitchSessionsByUser from "../repositories/getPitchSessionsForUser";
import logger from "../utils/logger";
import { calculatePaginationValues } from "../utils/pagination";
import buildQuery from "../utils/buildQuery";
import { handleSuccess, handleError } from "../utils/responseHandler";

const router = Router();

/**
 * @swagger
 * /api/v1/sessions:
 *   get:
 *     summary: Get Past Pitch Sessions for User.
 *     description: Allow founders to get past pitch session records with search and filter.
 *     tags:
 *       - Founders
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: Search by session ID.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Pitch Sessions retrieved successfully.
 */
router.get(
  "",
  authenticateUserToken,
  ensureOnboardingCompleted,
  async (req: Request, res: Response): Promise<void> => {
    try {
      //@ts-ignore
      const userId = req.user.uid;
      let { page = 1, limit = 10 } = req.query;
      page = Number(page);
      limit = Number(limit);

      logger.info(`Fetching pitch sessions for user ${userId}`);
      const query: Record<string, any> = buildQuery(req.query);
      const { skip, recordsPerPage } = calculatePaginationValues(page, limit);

      const cacheKey = `pitch_sessions_${userId}_page_${page}_limit_${limit}`;

      let cachedSessions;
      try {
        cachedSessions = await redisClient.get(cacheKey);
      } catch (error) {
        logger.error(`Failed to fetch cached pitch sessions: ${error}`);
      }

      if (cachedSessions) {
        res.status(200).json(JSON.parse(cachedSessions));
        return;
      }

      const result = await getPitchSessionsByUser(
        query,
        userId,
        skip,
        recordsPerPage,
      );

      if (!result.success) {
        handleError(res, result.message || "Failed to fetch pitch sessions", {
          sessions: [],
        }, 404);
        return;
      }

      const responseData = {
        sessions: result.data.sessions,
        pagination: {
          total: result.data.totalCount,
          page,
          limit: recordsPerPage,
        },
      };

      try {
        await redisClient.setEx(cacheKey, 180, JSON.stringify({ message: result.message, data: responseData, statusCode: 200, error: null }));
      } catch (error) {
        logger.error(`Failed to cache pitch sessions: ${error}`);
      }

      handleSuccess(res, result.message || "User sessions retrieved successfully", responseData);
    } catch (error) {
      logger.error(`Failed to fetch pitch sessions: ${error}`);
      handleError(res, "Internal server error while fetching pitch sessions", {
        sessions: [],
      }, 500);
    }
  },
);

export default router;
