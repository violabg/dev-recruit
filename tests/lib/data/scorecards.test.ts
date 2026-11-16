import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    scorecard: { findUnique: vi.fn() },
    scorecardCriterion: { findMany: vi.fn() },
  },
}));

import {
  getCriterionOptionsByPosition,
  getScorecardByPositionId,
} from "@/lib/data/scorecards";
import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

const db = prisma as any;

const criterionRow = (
  id: string,
  order: number,
  archivedAt: Date | null,
  anchors: unknown = { weak: "w", medium: "m", strong: "s" },
) => ({
  id,
  scorecardId: "sc-1",
  name: `Criterio ${id}`,
  description: null,
  category: "technical",
  priority: "must",
  weight: 3,
  expectedLevel: 3,
  anchors,
  source: "skill",
  order,
  archivedAt,
  createdAt: new Date("2026-01-01"),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getScorecardByPositionId", () => {
  it("is cached for hours with the scorecard, position and entity tags", async () => {
    db.scorecard.findUnique.mockResolvedValueOnce(null);

    await getScorecardByPositionId("pos-1");

    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith(
      "scorecards",
      "positions",
      "scorecard-pos-1",
    );
    expect(db.scorecard.findUnique).toHaveBeenCalledWith({
      where: { positionId: "pos-1" },
      select: {
        id: true,
        positionId: true,
        criteria: { orderBy: { order: "asc" } },
      },
    });
  });

  it("returns null when the position has no scorecard", async () => {
    db.scorecard.findUnique.mockResolvedValueOnce(null);

    expect(await getScorecardByPositionId("pos-1")).toBeNull();
  });

  it("splits active and archived criteria and normalizes the anchors", async () => {
    db.scorecard.findUnique.mockResolvedValueOnce({
      id: "sc-1",
      positionId: "pos-1",
      criteria: [
        criterionRow("a", 0, null),
        criterionRow("old", 1, new Date("2026-01-02")),
        criterionRow("b", 2, null, { weak: "solo debole" }),
        criterionRow("newer", 3, new Date("2026-01-05"), null),
      ],
    });

    const scorecard = await getScorecardByPositionId("pos-1");

    expect(scorecard?.id).toBe("sc-1");
    expect(scorecard?.positionId).toBe("pos-1");
    // Active criteria in order
    expect(scorecard?.criteria.map((criterion) => criterion.id)).toEqual([
      "a",
      "b",
    ]);
    // Archived criteria, most recently archived first
    expect(scorecard?.archivedCriteria.map((criterion) => criterion.id)).toEqual(
      ["newer", "old"],
    );
    expect(scorecard?.criteria[1].anchors).toEqual({
      weak: "solo debole",
      medium: "",
      strong: "",
    });
    expect(scorecard?.archivedCriteria[0].anchors).toEqual({
      weak: "",
      medium: "",
      strong: "",
    });
    expect(scorecard?.criteria[0]).toEqual({
      id: "a",
      name: "Criterio a",
      description: null,
      category: "technical",
      priority: "must",
      weight: 3,
      expectedLevel: 3,
      anchors: { weak: "w", medium: "m", strong: "s" },
      source: "skill",
      order: 0,
      archivedAt: null,
    });
  });
});

describe("getCriterionOptionsByPosition", () => {
  it("is cached for hours with the scorecards tag and reads active criteria only", async () => {
    db.scorecardCriterion.findMany.mockResolvedValueOnce([]);

    expect(await getCriterionOptionsByPosition()).toEqual({});
    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith("scorecards");
    expect(db.scorecardCriterion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { archivedAt: null },
        orderBy: { order: "asc" },
      }),
    );
  });

  it("groups the criteria by position, keeping their order", async () => {
    db.scorecardCriterion.findMany.mockResolvedValueOnce([
      {
        id: "a1",
        name: "React",
        category: "technical",
        priority: "must",
        scorecard: { positionId: "pos-a" },
      },
      {
        id: "b1",
        name: "Go",
        category: "technical",
        priority: "nice",
        scorecard: { positionId: "pos-b" },
      },
      {
        id: "a2",
        name: "Comunicazione",
        category: "soft",
        priority: "must",
        scorecard: { positionId: "pos-a" },
      },
    ]);

    expect(await getCriterionOptionsByPosition()).toEqual({
      "pos-a": [
        { id: "a1", name: "React", category: "technical", priority: "must" },
        { id: "a2", name: "Comunicazione", category: "soft", priority: "must" },
      ],
      "pos-b": [
        { id: "b1", name: "Go", category: "technical", priority: "nice" },
      ],
    });
  });
});
