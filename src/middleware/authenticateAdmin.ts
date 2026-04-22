import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import Logger from "../utils/logger";
import { handleError } from "../utils/responseHandler";

export const authenticateAdminToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Check cookie first, then fall back to authorization header
  const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1] || "";

  if (!token) {
    return handleError(res, "Kindly login to access this resource!", null, 401);
  }

  const payload = verifyToken(token);

  if (payload) {
    if (payload.role.toLowerCase() !== "admin") {
      return handleError(res, "Unauthorized: only admin has access to this resource!", null, 403);
    }
    //@ts-ignore
    req.user = payload;
    Logger.info(`Admin ${payload.email} authenticated via ${req.cookies?.accessToken ? 'cookie' : 'header'}`);
    next();
  } else {
    return handleError(res, "Invalid or expired session!", null, 401);
  }
};
