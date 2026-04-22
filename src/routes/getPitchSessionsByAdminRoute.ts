import { Router, Request, Response } from "express";
import { authenticateAdminToken } from "../middleware/authenticateAdmin";
import redisClient from "../config/redis";
import getPitchSessions from "../repositories/getPitchSessions";
import logger from "../utils/logger";
import { calculatePaginationValues } from "../utils/pagination";
import buildQuery from "../utils/buildQuery";
import { handleSuccess, handleError } from "../utils/responseHandler";

const router = Router();

/**
 * @swagger
 * /ms-get-usage-metrics/admin/pitch-sessions:
 *   get:
 *     summary: Search and Filter Pitch Sessions by Admin.
 *     description: Allow admin users to search and filter pitch simulator session records.
 *     tags:
 *       - Admins
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/admin/pitch-sessions",
  authenticateAdminToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      let { page = 1, limit = 10 } = req.query;
      page = Number(page);
      limit = Number(limit);

      logger.info(`Fetching pitch sessions for admin`);
      const query: Record<string, any> = buildQuery(req.query);
      const { skip, recordsPerPage } = calculatePaginationValues(page, limit);

      const cacheKey = `admin_pitch_sessions_${JSON.stringify(query)}_page_${page}_limit_${limit}`;

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

      const result = await getPitchSessions(query, skip, recordsPerPage);

      if (!result.success) {
        handleError(res, result.message || "Failed to fetch pitch sessions", {
          sessions: [],
        }, 404);
        return;
      }

      const responseData = {
        pagination: {
          total: result.data?.totalCount || 0,
          page: Number(page),
          limit: recordsPerPage,
        },
        sessions: result.data?.sessions || [],
      };

      try {
        await redisClient.setEx(cacheKey, 300, JSON.stringify({ message: result.message, data: responseData, statusCode: 200, error: null }));
      } catch (error) {
        logger.error(`Failed to cache pitch sessions: ${error}`);
      }

      handleSuccess(res, "Admin sessions retrieved successfully", {
        sessions: responseData.sessions,
        pagination: responseData.pagination
      });
    } catch (error: any) {
      logger.error(`Error retrieving sessions for admin: ${error.message}`);
      handleError(res, error.message, null, 500);
    }
  },
);

export default router;
