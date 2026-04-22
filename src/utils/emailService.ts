import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import configs from "../config";
import Logger from "./logger";

const sesClient = new SESClient({
  region: configs.AWS_SES_REGION_NAME as string,
  credentials: {
    accessKeyId: configs.AWS_ACCESS_KEY as string,
    secretAccessKey: configs.AWS_SECRET_KEY as string,
  },
});

export const sendVerificationEmail = async (to: string, token: string) => {
  const verificationLink = `${configs.FRONTEND_URL}/verify/${token}`;

  const params = {
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
            <h1>Welcome to AI Investor Pitch Simulator</h1>
            <p>Please click the link below to verify your email address and start practicing your pitch!</p>
            <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Verify Email</a>
            <p>Verification Link: ${verificationLink}</p>
            <p>If you did not request this, please ignore this email.</p>
          `,
        },
        Text: {
          Charset: "UTF-8",
          Data: `Welcome to AI Investor Pitch Simulator! Please verify your email by clicking here: ${verificationLink}`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Verify your email - AI Investor Pitch Simulator",
      },
    },
    Source: configs.EMAIL_SENDER || "noreply@lightforth.org",
  };

  try {
    const command = new SendEmailCommand(params);
    const data = await sesClient.send(command);
    Logger.info(`Verification email sent to ${to}. MessageId: ${data.MessageId}`);
    return data;
  } catch (error: any) {
    Logger.error(`Error sending verification email to ${to}: ${error.message}`);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

export const sendResetPasswordEmail = async (to: string, token: string) => {
  const resetLink = `${configs.FRONTEND_URL}/reset-password?token=${token}`;

  const params = {
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
            <h1>Reset Your Password - AI Investor Pitch Simulator</h1>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: #fff; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>Reset Link: ${resetLink}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
          `,
        },
        Text: {
          Charset: "UTF-8",
          Data: `Reset your password for AI Investor Pitch Simulator by clicking here: ${resetLink}. The link expires in 1 hour.`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Reset your password - AI Investor Pitch Simulator",
      },
    },
    Source: configs.EMAIL_SENDER || "noreply@lightforth.org",
  };

  try {
    const command = new SendEmailCommand(params);
    const data = await sesClient.send(command);
    Logger.info(`Reset password email sent to ${to}. MessageId: ${data.MessageId}`);
    return data;
  } catch (error: any) {
    Logger.error(`Error sending reset password email to ${to}: ${error.message}`);
    throw new Error(`Failed to send reset password email: ${error.message}`);
  }
};
