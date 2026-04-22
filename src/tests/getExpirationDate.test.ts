import getSessionExpirationDate from "../utils/sessionExpiration";

describe("get expiration date", () => {
  it("should return current date if timestamp is zero", () => {
    const timestamp: number = 0;
    const result: string = getSessionExpirationDate(timestamp);
    expect(result).toBe(new Date(0).toUTCString());
  });
});

describe("get expiration date", () => {
  it("should return current date if timestamp is negative", () => {
    const timestamp: number = -1;
    const result: string = getSessionExpirationDate(timestamp);
    expect(result).toBe(new Date(-1).toUTCString());
  });
});

describe("get expiration date", () => {
  it("should return date if timestamp is positive", () => {
    const timestamp: number = 1736933374;
    const result: string = getSessionExpirationDate(timestamp);
    expect(result).toBe(new Date(1736933374 * 1000).toUTCString());
  });
});
