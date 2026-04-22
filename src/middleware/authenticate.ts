import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import Logger from "../utils/logger";
import { handleError } from "../utils/responseHandler";

export const authenticateUserToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Check cookie first, then fall back to authorization header
  const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1] || "";

  if (!token) {
    Logger.error("Unauthorized: token not provided");
    return handleError(res, "Kindly login to continue", null, 401);
  }

  const payload = verifyToken(token);

  if (payload) {
    //@ts-ignore
    req.user = payload;
    Logger.info(`User ${payload.email} authenticated via ${req.cookies?.accessToken ? 'cookie' : 'header'}`);
    next();
  } else {
    Logger.error("Unauthorized: Invalid or expired access");
    return handleError(res, "Invalid or expired access", null, 401);
  }
};

export const ensureOnboardingCompleted = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  //@ts-ignore
  const user = req.user;

  if (user && user.onboardingStatus === "completed") {
    next();
  } else {
    Logger.error(`Access denied: User ${user?.email} has not completed onboarding`);
    return handleError(
      res, 
      "Please complete your onboarding to access this resource", 
      null, 
      403
    );
  }
};
