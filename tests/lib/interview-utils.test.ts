import {
  getInterviewExpiryDate,
  isInterviewExpired,
} from "@/lib/utils/interview-utils";
import { describe, expect, it } from "vitest";

describe("interview-utils", () => {
  it("returns null when startedAt or timeLimit missing", () => {
    expect(getInterviewExpiryDate(null, null)).toBeNull();
    expect(getInterviewExpiryDate(new Date(), 0)).toBeNull();
  });

  it("calculates expiry date correctly from string", () => {
    const start = "2020-01-01T00:00:00.000Z";
    const expiry = getInterviewExpiryDate(start, 30);
    expect(expiry).toBeInstanceOf(Date);
    expect(expiry!.getUTCMinutes()).toBe(30);
  });

  it("isInterviewExpired returns false when not started or completed or no limit", () => {
    expect(isInterviewExpired(null, null, 30)).toBe(false);
    expect(
      isInterviewExpired(
        "2020-01-01T00:00:00.000Z",
        "2020-01-01T00:10:00.000Z",
        30
      )
    ).toBe(false);
    expect(isInterviewExpired("2020-01-01T00:00:00.000Z", null, 0)).toBe(false);
  });

  it("isInterviewExpired returns true for past expiry", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
    // timeLimit 1 minute -> expired
    expect(isInterviewExpired(past, null, 1)).toBe(true);
  });
});
