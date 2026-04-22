import { JwtPayload } from "jsonwebtoken";
import { verifyToken } from "../utils/auth";

describe("verify user access token", () => {
  it("should return null if token is not provided", () => {
    const token: string = "";
    const result: JwtPayload | null = verifyToken(token);
    expect(result).toBeNull();
  });
});

describe("verify user access token", () => {
  it("should return null if token is wrong or incorrect format", () => {
    const token: string = "hhvhshvhvsvhshvdsiu8rrurew";
    const result: JwtPayload | null = verifyToken(token);
    expect(result).toBeNull();
  });
});

describe("verify user access token", () => {
  it("should return null if token is expired", () => {
    const token: string =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Imhhcm9mLmRldkBnbWFpbC5jb20iLCJ1aWQiOiI2NzJiM2VjMGZlZjRmYmZlZjNhNjFmM2UiLCJyb2xlIjoidXNlciIsImlhdCI6MTczNjg4MjI5MSwiZXhwIjoxNzM2ODg1ODkxfQ.XnsdUiY3IYvHPpPkmmBVkSvN1lo9Tf5F0L3bkHJp-uA";
    const result: JwtPayload | null = verifyToken(token);
    expect(result).toBeNull();
  });
});

// describe('verify user access token', () => {
//     it('should return payload if token is valid', () => {
//         const token: string = ""
//         const result: JwtPayload | null = verifyToken(token);
//         expect(result).toBeDefined();
//         expect(result?.email).toBeDefined();
//         expect(result?.uid).toBeDefined();
//         expect(result?.exp).toBeDefined();
//     })
// })
