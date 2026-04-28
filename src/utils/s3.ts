import configs from "../config";
import Logger from "./logger";
import fs from "fs-extra";
import path from "path";

export const uploadResumeToS3 = async (
  file: Express.Multer.File | null | undefined,
  sessionId: string,
) => {
  if (!file) throw new Error("No file provided for upload.");
  if (!sessionId) throw new Error("Session ID is required.");

  const uploadsDir = configs.UPLOADS_DIR;
  const fileName = `${sessionId}_${file.originalname}`;
  const filePath = path.join(uploadsDir, fileName);

  try {
    Logger.info("Uploading file locally to:", filePath);
    
    // Ensure the uploads directory exists
    await fs.ensureDir(uploadsDir);
    
    // Write the file buffer to the local filesystem
    await fs.writeFile(filePath, file.buffer);
    
    Logger.info("File uploaded successfully for user: ", sessionId);
    
    // Return the local URL
    return `${configs.SERVER_URL}/uploads/${fileName}`;
  } catch (error) {
    Logger.error("Error uploading file locally:", error);
    throw new Error("Failed to upload pitch deck file locally.");
  }
};
