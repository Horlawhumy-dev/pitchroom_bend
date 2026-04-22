import { calculatePaginationValues } from "../utils/pagination";

describe("calculate pagination skip and records per page from limit and page", () => {
  it("Should return 0 skip and 10 records for 1 page and 10 limit ", () => {
    const { skip, recordsPerPage } = calculatePaginationValues(1, 10);
    expect(skip).toBe(0);
    expect(recordsPerPage).toBe(10);
  });
});

describe("calculate pagination skip and records per page from limit and page", () => {
  it("Should return 10 skip and 10 records for 2 page and 10 limit ", () => {
    const { skip, recordsPerPage } = calculatePaginationValues(2, 10);
    expect(skip).toBe(10);
    expect(recordsPerPage).toBe(10);
  });
});

describe("calculate pagination skip and records per page from limit and page", () => {
  it("Should return -10 skip and 10 records for 0 page and 10 limit ", () => {
    const { skip, recordsPerPage } = calculatePaginationValues(0, 10);
    expect(skip).toBe(-10);
    expect(recordsPerPage).toBe(10);
  });
});
