import { Router, Request, Response } from "express";
import deactivateSession from "../repositories/deactivateSession";
import logger from "../utils/logger";
import { authenticateUserToken, ensureOnboardingCompleted } from "../middleware/authenticate";
import redisClient from "../config/redis";
import { handleSuccess, handleError } from "../utils/responseHandler";

const router = Router();

/**
 * @swagger
 * /api/v1/cancel/session:
 *   patch:
 *     summary: Deactivate a user session.
 *     description: Ends a user session by deactivating it using the session ID.
 *     tags:
 *       - Founders
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: The ID of the session to deactivate.
 *                 example: "abcd1234"
 *     responses:
 *       200:
 *         description: Session ended successfully.
 *       400:
 *         description: Bad request. Missing or invalid session ID.
 *       404:
 *         description: Not found session with the given ID.
 *       401:
 *         description: Unauthorized access. Authentication required.
 */

router.patch(
  "/session",
  authenticateUserToken,
  ensureOnboardingCompleted,
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.body;
    if (!sessionId) {
      handleError(res, "Session ID is required", null, 400);
      return;
    }

    try {
      const updatedSession = await deactivateSession(sessionId);

      if (!updatedSession) {
        handleError(res, "Session not found", null, 404);
        return;
      }
      if (!updatedSession.isActive) {
        handleError(res, "Session is already deactivated", null, 400);
        return;
      }

      logger.info(
        `Session ${sessionId} cancelled successfully at ${new Date().toLocaleString()}`,
      );

      try {
        // Delete the session from cache
        await redisClient.del(sessionId);
        logger.info(`Session ${sessionId} deleted from cache`);
      } catch (error: any) {
        logger.error(`Failed to delete session from cache: ${error.message}`);
      }

      handleSuccess(res, "Session deactivated successfully", {
        success: !!updatedSession,
      });
    } catch (error: any) {
      logger.error(`Session ${sessionId}: ${error}`);
      handleError(res, error.message, null, 500);
    }
  },
);

export default router;
