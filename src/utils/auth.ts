import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Response } from "express";
import configs from "../config";
import logger from "./logger";

export interface JwtPayload {
  uid: string;
  email: string;
  fullName: string;
  onboardingStatus: string;
  exp: number;
  role: string;
}

const JWT_SECRET = configs.JWT_SECRET || "default_super_secret_key_for_dev";

export const generateToken = (payload: Omit<JwtPayload, "exp">): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    logger.error(`Error verifying token: ${(error as Error).message}`);
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(password, hashed);
};

export const setAuthCookies = (
  res: Response,
  token: string,
  user: { fullName: string; role: string; onboardingStatus: string; workEmail: string }
) => {
  // HttpOnly cookie for the access token (Security)
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Non-HttpOnly cookie for user details (Frontend accessibility)
  res.cookie("user", JSON.stringify(user), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken");
  res.clearCookie("user");
};

