import { Router, Request, Response } from "express";
import * as authRepository from "../repositories/authRepository";
import Logger from "../utils/logger";
import { handleSuccess, handleError } from "../utils/responseHandler";
import { authenticateUserToken } from "../middleware/authenticate";

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, workEmail, password]
 *             properties:
 *               fullName:
 *                 type: string
 *               workEmail:
 *                 type: string
 *               password:
 *                 type: string
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { fullName, workEmail, password } = req.body;
    const result = await authRepository.register(fullName, workEmail, password);
    handleSuccess(res, result.message || "Account registered successfully", null, 201);
  } catch (error: any) {
    Logger.error(`Registration error: ${error.message}`);
    handleError(res, error.message || "Registration failed", null, 400);
  }
});

/**
 * @swagger
 * /api/v1/auth/verify/{token}:
 *   get:
 *     summary: Verify email with token
 *     tags:
 *       - Auth
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/verify/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const result = await authRepository.verifyEmail(token);

    handleSuccess(res, result.message);
  } catch (error: any) {
    Logger.error(`Registration error: ${error.message}`);
    handleError(res, error.message || "Registration failed", null, 400);
  }
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags:
 *       - Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [workEmail, password]
 *             properties:
 *               workEmail:
 *                 type: string
 *               password:
 *                 type: string
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { workEmail, password } = req.body;
    const result = await authRepository.login(res, workEmail, password);

    handleSuccess(res, result.message);
  } catch (error: any) {
    Logger.error(`Login error: ${error.message}`);
    handleError(res, error.message, null, 401);
  }
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags:
 *       - Auth
 */
router.post(
  "/logout",
  authenticateUserToken,
  async (req: Request, res: Response) => {
    const updatedSession = authRepository.logout(res);
    handleSuccess(res, "Session deactivated successfully", {
      success: !!updatedSession,
    });
  },
);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     tags:
 *       - Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [workEmail]
 *             properties:
 *               workEmail:
 *                 type: string
 */
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { workEmail } = req.body;
    const result = await authRepository.forgotPassword(workEmail);

    handleSuccess(res, result.message);
  } catch (error: any) {
    Logger.error(`Forgot password error: ${error.message}`);
    handleError(res, error.message, null, 400);
  }
});

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags:
 *       - Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 */
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authRepository.resetPassword(token, newPassword);

    handleSuccess(res, result.message);
  } catch (error: any) {
    Logger.error(`Reset password error: ${error.message}`);
    handleError(res, error.message, null, 400);
  }
});

/**
 * @swagger
 * /api/v1/auth/onboarding:
 *   post:
 *     summary: Complete onboarding process
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [onboardingData]
 *             properties:
 *               onboardingData:
 *                 type: object
 */
router.post("/onboarding", authenticateUserToken, async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.uid;
    const { onboardingData } = req.body;
    const result = await authRepository.completeOnboarding(res, userId, onboardingData);

    handleSuccess(res, result.message);
  } catch (error: any) {
    Logger.error(`Onboarding error: ${error.message}`);
    handleError(res, error.message, null, 400);
  }
});

/**
 * @swagger
 * /api/v1/auth/resend-email:
 *   post:
 *     summary: Resend verification or password reset email
 *     tags:
 *       - Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [workEmail, type]
 *             properties:
 *               workEmail:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [verification, reset-password]
 */
router.post("/resend-email", async (req: Request, res: Response) => {
  try {
    const { workEmail, type } = req.body;
    if (!workEmail || !type) {
      throw new Error("Email and request type are required.");
    }

    const result = await authRepository.resendEmail(workEmail, type);
    handleSuccess(res, result.message);
  } catch (error: any) {
    Logger.error(`Resend email error: ${error.message}`);
    handleError(res, error.message, null, 400);
  }
});

export default router;
