import { uploadResumeToS3 } from "../utils/s3";
import Logger from "../utils/logger";
import configs from "../config";
import { awsBucket } from "../config/aws";

jest.mock("../utils/logger");
jest.mock("../config");
jest.mock("../config/aws", () => ({
  awsBucket: {
    upload: jest.fn(),
  },
}));

describe("uploadResumeToS3", () => {
  const mockSessionId = "testSession123";
  const mockFile = {
    originalname: "resume.pdf",
    buffer: Buffer.from("test file content"),
    mimetype: "application/pdf",
  } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    (configs.S3_BUCKET_NAME as string) = "mock-bucket-name";
  });

  it("should upload a file to S3 and return the file URL", async () => {
    const mockS3Response = {
      Location:
        "https://mock-bucket-name.s3.amazonaws.com/pitch-simulator/testSession123_resume.pdf",
    };
    (awsBucket.upload as jest.Mock).mockReturnValue({
      promise: jest.fn().mockResolvedValue(mockS3Response),
    });

    const result = await uploadResumeToS3(mockFile, mockSessionId);

    expect(result).toBe(mockS3Response.Location);
    expect(awsBucket.upload).toHaveBeenCalledWith({
      Bucket: configs.S3_BUCKET_NAME,
      Key: `pitch-simulator/${mockSessionId}_${mockFile.originalname}`,
      Body: mockFile.buffer,
      ContentType: mockFile.mimetype,
    });
    expect(Logger.info).toHaveBeenCalledWith(
      "Uploading file to S3 with key:",
      `pitch-simulator/${mockSessionId}_${mockFile.originalname}`,
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

  it("should throw an error if the S3 bucket name is missing", async () => {
    (configs.S3_BUCKET_NAME as string | undefined) = undefined;
    await expect(uploadResumeToS3(mockFile, mockSessionId)).rejects.toThrow(
      "S3 bucket name is not defined in configs.",
    );
  });

  it("should throw an error if S3 upload fails", async () => {
    (awsBucket.upload as jest.Mock).mockReturnValue({
      promise: jest.fn().mockRejectedValue(new Error("S3 upload failed")),
    });

    await expect(uploadResumeToS3(mockFile, mockSessionId)).rejects.toThrow(
      "Failed to upload pitch deck file to bucket.",
    );
    expect(Logger.error).toHaveBeenCalledWith(
      "Error uploading to S3:",
      expect.any(Error),
    );
  });
});
