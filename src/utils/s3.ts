import configs from "../config";
import { awsBucket } from "../config/aws";
import Logger from "./logger";

export const uploadResumeToS3 = async (
  file: Express.Multer.File | null | undefined,
  sessionId: string,
) => {
  if (!file) throw new Error("No file provided for upload.");
  if (!sessionId) throw new Error("Session ID is required.");
  if (!configs.S3_BUCKET_NAME)
    throw new Error("S3 bucket name is not defined in configs.");

  const s3Params = {
    Bucket: configs.S3_BUCKET_NAME,
    Key: `pitch-simulator/${sessionId}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    Logger.info("Uploading file to S3 with key:", s3Params.Key);
    const s3Response = await awsBucket.upload(s3Params).promise();
    Logger.info("File uploaded successfully for user: ", sessionId);
    return s3Response.Location;
  } catch (error) {
    Logger.error("Error uploading to S3:", error);
    throw new Error("Failed to upload pitch deck file to bucket.");
  }
};
