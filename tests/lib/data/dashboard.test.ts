import {
  getCandidatesCount,
  getCompletedInterviewsCount,
  getPositionsCount,
  getRecentPositions,
} from "@/lib/data/dashboard";
import { describe, expect, it } from "vitest";

describe("dashboard data layer", () => {
  it("re-exports getCandidatesCount", async () => {
    expect(typeof getCandidatesCount).toBe("function");
  });

  it("re-exports getCompletedInterviewsCount", async () => {
    expect(typeof getCompletedInterviewsCount).toBe("function");
  });

  it("re-exports getPositionsCount", async () => {
    expect(typeof getPositionsCount).toBe("function");
  });

  it("re-exports getRecentPositions", async () => {
    expect(typeof getRecentPositions).toBe("function");
  });
});
