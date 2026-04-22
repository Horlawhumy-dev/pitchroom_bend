import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as authRepository from "../repositories/authRepository";
import { User } from "../models/user";
import redisClient from "../config/redis";
import { sendVerificationEmail } from "../utils/emailService";

// Mock dependencies
jest.mock("../config/redis", () => ({
  __esModule: true,
  default: {
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock("../utils/emailService", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ MessageId: "test-id" }),
}));

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  jest.clearAllMocks();
});

describe("Auth Flow (Optimized)", () => {
  const testUser = {
    fullName: "John Doe",
    workEmail: "john@acme.inc",
    password: "securePassword123",
  };

  it("should register a new user and cache token in Redis", async () => {
    (redisClient.setEx as jest.Mock).mockResolvedValue("OK");

    const result = await authRepository.register(testUser.fullName, testUser.workEmail, testUser.password);
    expect(result.message).toContain("Registration successful");

    const user = await User.findOne({ workEmail: testUser.workEmail });
    expect(user).toBeDefined();
    expect(user?.isVerified).toBe(false);

    // Verify Redis caching
    expect(redisClient.setEx).toHaveBeenCalledWith(
      expect.stringContaining("verify:"),
      expect.any(Number),
      testUser.workEmail
    );

    // Verify background email triggered
    expect(sendVerificationEmail).toHaveBeenCalled();
  });

  it("should verify email using Redis token", async () => {
    const token = "test-token";
    (redisClient.get as jest.Mock).mockResolvedValue(testUser.workEmail);
    (redisClient.del as jest.Mock).mockResolvedValue(1);

    // Setup user in DB
    await new User({ ...testUser, isVerified: false }).save();

    const result = await authRepository.verifyEmail(token);
    expect(result.message).toContain("verified successfully");

    const user = await User.findOne({ workEmail: testUser.workEmail });
    expect(user?.isVerified).toBe(true);
    expect(redisClient.del).toHaveBeenCalledWith(`verify:${token}`);
  });

  it("should fail verification if token not in Redis", async () => {
    (redisClient.get as jest.Mock).mockResolvedValue(null);

    await expect(authRepository.verifyEmail("invalid-token")).rejects.toThrow("Invalid or expired verification token.");
  });

  it("should login successfully after verification", async () => {
    // Setup user via official channels to ensure hashing and verification logic is correct
    await authRepository.register(testUser.fullName, testUser.workEmail, testUser.password);
    
    // Simulate verification by manually setting isVerified to true (or using mocked Redis)
    const user = await User.findOne({ workEmail: testUser.workEmail });
    user!.isVerified = true;
    await user!.save();

    const mockResponse = {
      cookie: jest.fn(),
    } as any;

    const result = await authRepository.login(mockResponse, testUser.workEmail, testUser.password);
    expect(result.message).toBe("Login successful");
    
    // Auth token should be in accessToken cookie
    expect(mockResponse.cookie).toHaveBeenCalledWith("accessToken", expect.any(String), expect.any(Object));
    
    // User data should be in user cookie (non-HttpOnly)
    expect(mockResponse.cookie).toHaveBeenCalledWith("user", JSON.stringify({
      fullName: testUser.fullName,
      role: "user"
    }), expect.any(Object));
  });
});
