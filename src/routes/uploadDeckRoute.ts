import { Router, Request, Response } from "express";
import { upload } from "../middleware/upload";
import { authenticateUserToken, ensureOnboardingCompleted } from "../middleware/authenticate";
import { v4 as uuidv4 } from "uuid";
import { PitchSession } from "../models/pitchSession";
import redisClient from "../config/redis";
import { fileLimit, redisExp } from "../utils/constants";
import { uploadResumeToS3 as uploadDeckToS3 } from "../utils/s3";
import logger from "../utils/logger";
import extractFile from "../utils/extractFile";
import { handleSuccess, handleError } from "../utils/responseHandler";

const router = Router();

/**
 * @swagger
 * /api/v1/upload:
 *   post:
 *     summary: Upload pitch deck (5MB limit) and provide business context.
 *     description: Allows founders to upload a pitch deck file and provide context for the simulation.
 *     tags:
 *       - Founders
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               deck:
 *                 type: string
 *                 format: binary
 *                 description: The pitch deck file (PDF).
 *               context:
 *                 type: string
 *                 description: Additional context about the business.
 *               settingsType:
 *                 type: string
 *                 description: The mode for the session. (interrogation, coaching, practice)
 *               pitchStage:
 *                 type: string
 *                 description: The stage of the pitch (Seed, Series A, etc).
 *     responses:
 *       200:
 *         description: Session created successfully.
 *       400:
 *         description: Bad request. Invalid input or file size exceeded.
 *       500:
 *         description: Internal server error.
 */
router.post(
  "",
  authenticateUserToken,
  ensureOnboardingCompleted,
  upload.single("deck"),
  async (req: Request, res: Response) => {
    let { context, settingsType, pitchStage } =
      req.body;
    let deckFile = req.file;
    //@ts-ignore
    const user = req.user;

    if (!settingsType) {
      settingsType = "practice";
    }

    if (!deckFile) {
      logger.error("No pitch deck file provided");
      handleError(res, "No pitch deck file provided", null, 400);
      return;
    }

    if (!context) {
      logger.error("Missing required fields: context");
      handleError(res, "Business context is required.", null, 400);
      return;
    }

    if (!["interrogation", "coaching", "practice"].includes(settingsType)) {
      logger.error(`Invalid settings type: ${settingsType}`);
      handleError(res, "Invalid settings type. Use interrogation, coaching, or practice", null, 400);
      return;
    }

    if (deckFile && deckFile.size > fileLimit) {
      logger.error(`File exceeds size limit: ${deckFile.size} bytes`);
      handleError(res, "Uploaded deck exceeds the maximum size of 5 MB", null, 400);
      return;
    }

    if (!user) {
      logger.error("Invalid or expired access token");
      handleError(res, "Invalid or expired access token", null, 400);
      return;
    }

    const responseType = settingsType.toLowerCase();
    const userData = {
      email: user.email,
      uid: user.uid,
    };

    try {
      const sessionId = uuidv4();
      const createdAt = new Date();
      let deckContent = null;
      let deckPath = "";

      logger.info(`Uploading pitch deck for user: ${user.email}`);

      try {
        deckPath = await uploadDeckToS3(deckFile, sessionId);
      } catch (error: any) {
        logger.error("Error uploading deck to S3:", error.message);
        handleError(res, "An error occurred while uploading the pitch deck.", null, 500);
        return;
      }

      deckContent = await extractFile(deckFile);
      if (deckContent == "" || deckContent == null) {
        logger.error(
          `Failed to extract deck content for the user ${user.email} with session id ${sessionId}`,
        );
        handleError(res, "Failed to extract the uploaded deck content.", null, 400);
        return;
      }

      logger.info(
        "Saving the pitch session for user:",
        userData.email,
      );

      const session = new PitchSession({
        sessionId,
        uid: userData.uid,
        pitchStage,
        businessContext: context,
        deckPath,
        isActive: true,
        responseType,
        createdAt: createdAt,
        duration: "",
      });

      deckContent = deckContent?.toString().trim();

      await Promise.all([
        session.save(),
        redisClient.setEx(
          sessionId,
          redisExp,
          JSON.stringify({
            deckContent,
            jobDescription: context,
            userData,
            createdAt: createdAt,
            isActive: true,
            responseType,
            pitchStage,
            duration: "",
          }),
        ),
      ]);

      logger.info(
        `Session ${sessionId} created and cached for user: ${user.email}`,
      );

      handleSuccess(res, "Pitch session created successfully", {
        session: sessionId,
        isActive: true,
        uid: userData.uid,
        responseType,
        createdAt,
      });
    } catch (error) {
      logger.error("Error processing upload:", error);
      handleError(res, "An error occurred while processing the upload.", null, 500);
    }
  },
);

export default router;
