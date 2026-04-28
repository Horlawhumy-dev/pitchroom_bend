import { User, IUser } from "../models/user";
import { hashPassword, comparePassword, generateToken, setAuthCookies, clearAuthCookies } from "../utils/auth";
import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Logger from "../utils/logger";
// import {
//   sendVerificationEmail,
//   sendResetPasswordEmail,
// } from "../utils/emailService";
import redisClient from "../config/redis";

// const PUBLIC_EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "icloud.com"];
const VERIFICATION_TOKEN_EXP = 24 * 60 * 60; // 24 hours in seconds

export const register = async (fullName: string, workEmail: string, password: string) => {
  const domain = workEmail.split("@")[1];
  // if (PUBLIC_EMAIL_DOMAINS.includes(domain.toLowerCase())) {
  //   throw new Error("Please use a work email address.");
  // }

  const existingUser = await User.findOne({ workEmail });
  if (existingUser) {
    throw new Error("Email already registered.");
  }

  const hashedPassword = await hashPassword(password);
  const verificationToken = uuidv4();

  const user = new User({
    fullName,
    workEmail,
    password: hashedPassword,
    isVerified: true,
  });

  await user.save();

  // Cache verification token in Redis
  try {
    await redisClient.setEx(`verify:${verificationToken}`, VERIFICATION_TOKEN_EXP, workEmail);
  } catch (error: any) {
    Logger.error(`Failed to cache verification token in Redis: ${error.message}`);
    // We proceed anyway as the user is saved, but this is a critical failure point for verification
  }

  // Send verification email in the background without blocking the response
  // sendVerificationEmail(workEmail, verificationToken).catch((error: any) => {
  //   Logger.error(`Background verification email failed for ${workEmail}: ${error.message}`);
  // });

  Logger.info(`Registration successful for ${workEmail}. Verification token (cached): ${verificationToken}`);

  return { message: "Registration successful. Please check your email for verification link." };
};

export const verifyEmail = async (token: string) => {
  const redisKey = `verify:${token}`;

  try {
    const workEmail = await redisClient.get(redisKey);
    if (!workEmail) {
      throw new Error("Invalid or expired verification token.");
    }

    const user = await User.findOne({ workEmail });
    if (!user) {
      throw new Error("Account not found.");
    }

    user.isVerified = true;
    await user.save();

    // Remove token from Redis after successful verification
    await redisClient.del(redisKey);

    return { message: "Email verified successfully. You can now login." };
  } catch (error: any) {
    Logger.error(`Verification error for token ${token}: ${error.message}`);
    throw error;
  }
};

export const login = async (res: Response, workEmail: string, password: string) => {
  const user = await User.findOne({ workEmail });
  if (!user) {
    throw new Error("Invalid credentials.");
  }

  if (!user.isVerified) {
    throw new Error("Please verify your email before logging in.");
  }

  const isMatch = await comparePassword(password, user.password!);
  if (!isMatch) {
    throw new Error("Invalid credentials.");
  }

  const token = generateToken({
    uid: (user._id as any).toString(),
    email: user.workEmail,
    fullName: user.fullName,
    onboardingStatus: user.onboardingStatus,
    role: user.role,
  });

  setAuthCookies(res, token, {
    fullName: user.fullName,
    role: user.role,
    onboardingStatus: user.onboardingStatus,
    workEmail: user.workEmail,
  });

  return {
    message: "Login successful",
  };
};


export const logout = (res: Response) => {
  clearAuthCookies(res);
  return { message: "Logged out successfully" };
};

export const forgotPassword = async (workEmail: string) => {
  const user = await User.findOne({ workEmail });
  if (!user) {
    throw new Error("No account found with this email address.");
  }

  const resetToken = uuidv4();
  const redisKey = `reset-pass:${resetToken}`;
  const RESET_TOKEN_EXP = 60 * 60; // 1 hour in seconds

  try {
    await redisClient.setEx(redisKey, RESET_TOKEN_EXP, workEmail);
  } catch (error: any) {
    Logger.error(`Failed to cache reset token in Redis: ${error.message}`);
    throw new Error("Internal server error. Please try again later.");
  }

  // Send reset password email in the background
  // sendResetPasswordEmail(workEmail, resetToken).catch((error: any) => {
  //   Logger.error(`Background reset email failed for ${workEmail}: ${error.message}`);
  // });

  Logger.info(`Password reset initiated for ${workEmail}. Token: ${resetToken}`);

  return { message: "Password reset link has been sent to your email." };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const redisKey = `reset-pass:${token}`;

  try {
    const workEmail = await redisClient.get(redisKey);
    if (!workEmail) {
      throw new Error("Invalid or expired reset token.");
    }

    const user = await User.findOne({ workEmail });
    if (!user) {
      throw new Error("User account not found.");
    }

    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    // Remove token from Redis after successful reset
    await redisClient.del(redisKey);

    Logger.info(`Password reset successful for ${workEmail}`);

    return { message: "Password has been reset successfully. You can now login with your new password." };
  } catch (error: any) {
    Logger.error(`Reset password error for token ${token}: ${error.message}`);
    throw error;
  }
};

export const completeOnboarding = async (res: Response, userId: string, onboardingData: any) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Account not found.");
    }

    user.onboardingStatus = "completed";
    user.onboardingData = onboardingData;
    await user.save();

    // Refresh cookies with updated onboarding status
    const token = generateToken({
      uid: user.id as string,
      email: user.workEmail,
      fullName: user.fullName,
      onboardingStatus: user.onboardingStatus,
      role: user.role,
    });

    setAuthCookies(res, token, {
      fullName: user.fullName,
      role: user.role,
      onboardingStatus: user.onboardingStatus,
      workEmail: user.workEmail,
    });

    Logger.info(`Onboarding completed for user: ${user.workEmail}`);
    return { message: "Onboarding completed successfully" };
  } catch (error: any) {
    Logger.error(`Onboarding error for userId ${userId}: ${error.message}`);
    throw error;
  }
};

export const resendEmail = async (workEmail: string, type: "verification" | "reset-password") => {
  const user = await User.findOne({ workEmail });
  if (!user) {
    throw new Error("No account found with this email address.");
  }

  const token = uuidv4();

  if (type === "verification") {
    if (user.isVerified) {
      throw new Error("This account is already verified.");
    }

    const redisKey = `verify:${token}`;
    await redisClient.setEx(redisKey, VERIFICATION_TOKEN_EXP, workEmail);

    // sendVerificationEmail(workEmail, token).catch((error: any) => {
    //   Logger.error(`Resend verification email failed for ${workEmail}: ${error.message}`);
    // });

    Logger.info(`Verification email resent to ${workEmail}. Token: ${token}`);
    return { message: "A new verification link has been sent to your email." };
  } else if (type === "reset-password") {
    const redisKey = `reset-pass:${token}`;
    const RESET_TOKEN_EXP = 60 * 60; // 1 hour in seconds

    await redisClient.setEx(redisKey, RESET_TOKEN_EXP, workEmail);

    // sendResetPasswordEmail(workEmail, token).catch((error: any) => {
    //   Logger.error(`Resend reset password email failed for ${workEmail}: ${error.message}`);
    // });

    Logger.info(`Reset password email resent to ${workEmail}. Token: ${token}`);
    return { message: "A new password reset link has been sent to your email." };
  } else {
    throw new Error("Invalid request type.");
  }
};
