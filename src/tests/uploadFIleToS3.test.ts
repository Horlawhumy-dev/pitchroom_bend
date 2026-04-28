import { uploadResumeToS3 } from "../utils/s3";
import Logger from "../utils/logger";
import configs from "../config";
import fs from "fs-extra";
import path from "path";

jest.mock("../utils/logger");
jest.mock("../config");
jest.mock("fs-extra");

describe("uploadResumeToS3 (Local)", () => {
  const mockSessionId = "testSession123";
  const mockFile = {
    originalname: "resume.pdf",
    buffer: Buffer.from("test file content"),
    mimetype: "application/pdf",
  } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    (configs.UPLOADS_DIR as string) = "uploads";
    (configs.SERVER_URL as string) = "http://localhost:3000";
  });

  it("should upload a file locally and return the file URL", async () => {
    const expectedFileName = `${mockSessionId}_${mockFile.originalname}`;
    const expectedFilePath = path.join("uploads", expectedFileName);
    const expectedUrl = `http://localhost:3000/uploads/${expectedFileName}`;

    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    // (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    const result = await uploadResumeToS3(mockFile, mockSessionId);

    expect(result).toBe(expectedUrl);
    expect(fs.ensureDir).toHaveBeenCalledWith("uploads");
    expect(fs.writeFile).toHaveBeenCalledWith(expectedFilePath, mockFile.buffer);

    expect(Logger.info).toHaveBeenCalledWith(
      "Uploading file locally to:",
      expectedFilePath,
    );
    expect(Logger.info).toHaveBeenCalledWith(
      "File uploaded successfully for user: ",
      mockSessionId,
    );
  });

  it("should throw an error if no file is provided", async () => {
    await expect(uploadResumeToS3(null as any, mockSessionId)).rejects.toThrow(
      "No file provided for upload.",
    );
  });

  it("should throw an error if no session ID is provided", async () => {
    await expect(uploadResumeToS3(mockFile, "")).rejects.toThrow(
      "Session ID is required.",
    );
  });

  it("should throw an error if local upload fails", async () => {
    (fs.ensureDir as jest.Mock).mockRejectedValue(new Error("File system error"));

    await expect(uploadResumeToS3(mockFile, mockSessionId)).rejects.toThrow(
      "Failed to upload pitch deck file locally.",
    );
    expect(Logger.error).toHaveBeenCalledWith(
      "Error uploading file locally:",
      expect.any(Error),
    );
  });
});
