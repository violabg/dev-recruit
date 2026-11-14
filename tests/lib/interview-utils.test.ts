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

import {
  acceptsAnswers,
  getRemainingSeconds,
  interviewState,
} from "../../lib/utils/interview-utils";

describe("interview lifecycle", () => {
  const now = new Date("2026-01-01T10:00:00Z");
  const minutesBefore = (minutes: number) =>
    new Date(now.getTime() - minutes * 60 * 1000);

  it("reports stored end states as they are", () => {
    const startedAt = minutesBefore(500);
    expect(
      interviewState({ status: "completed", startedAt, timeLimit: 30 }, now),
    ).toBe("completed");
    expect(
      interviewState({ status: "cancelled", startedAt, timeLimit: 30 }, now),
    ).toBe("cancelled");
  });

  it("is pending until started", () => {
    expect(
      interviewState({ status: "pending", startedAt: null, timeLimit: 30 }, now),
    ).toBe("pending");
  });

  it("is in progress within the time limit and expired after it", () => {
    const base = { status: "in_progress", timeLimit: 30 };
    expect(interviewState({ ...base, startedAt: minutesBefore(29) }, now)).toBe(
      "in_progress",
    );
    expect(interviewState({ ...base, startedAt: minutesBefore(31) }, now)).toBe(
      "expired",
    );
  });

  it("never expires without a time limit", () => {
    expect(
      interviewState(
        { status: "in_progress", startedAt: minutesBefore(9999), timeLimit: null },
        now,
      ),
    ).toBe("in_progress");
  });

  it("accepts answers during a short grace period only", () => {
    const base = { status: "in_progress", timeLimit: 30 };
    expect(acceptsAnswers({ ...base, startedAt: minutesBefore(30.5) }, now)).toBe(
      true,
    );
    expect(acceptsAnswers({ ...base, startedAt: minutesBefore(32) }, now)).toBe(
      false,
    );
    expect(
      acceptsAnswers(
        { status: "completed", startedAt: minutesBefore(1), timeLimit: 30 },
        now,
      ),
    ).toBe(false);
  });

  it("counts down the remaining seconds and stops at zero", () => {
    expect(getRemainingSeconds(minutesBefore(10), 30, now)).toBe(20 * 60);
    expect(getRemainingSeconds(minutesBefore(40), 30, now)).toBe(0);
    expect(getRemainingSeconds(null, 30, now)).toBeNull();
    expect(getRemainingSeconds(minutesBefore(10), null, now)).toBeNull();
  });
});
