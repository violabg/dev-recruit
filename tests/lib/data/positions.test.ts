import {
  getAllPositions,
  getOpenPositionsForSelect,
  getPositionById,
  getPositionCoverage,
  getPositionLevelsForSelect,
  getPositions,
  getPositionSetupStatus,
} from "@/lib/data/positions";
import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    position: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("positions data layer", () => {
  it("getPositions returns paginated results", async () => {
    (prisma.position.findMany as any).mockResolvedValueOnce([{ id: "p1" }]);
    (prisma.position.count as any).mockResolvedValueOnce(1);
    const res = await getPositions({ page: 1, pageSize: 10 });
    expect(res.positions[0].id).toBe("p1");
    expect(res.totalCount).toBe(1);
  });

  it("getPositionById returns null or record", async () => {
    (prisma.position.findFirst as any).mockResolvedValueOnce(null);
    expect(await getPositionById("x")).toBeNull();
    const rec = { id: "p2" };
    (prisma.position.findFirst as any).mockResolvedValueOnce(rec);
    expect(await getPositionById("p2")).toEqual(rec);
  });

  it("lists helpers return values", async () => {
    (prisma.position.findMany as any).mockResolvedValueOnce([{ id: "a" }]);
    expect(await getAllPositions()).toEqual([{ id: "a" }]);

    (prisma.position.findMany as any).mockResolvedValueOnce([{ id: "c" }]);
    expect(await getOpenPositionsForSelect()).toEqual([{ id: "c" }]);

    (prisma.position.findMany as any).mockResolvedValueOnce([
      { experienceLevel: "junior" },
      { experienceLevel: "senior" },
    ]);
    const levels = await getPositionLevelsForSelect();
    expect(levels).toContain("junior");
  });

  it("getPositions filters by status", async () => {
    (prisma.position.findMany as any).mockResolvedValueOnce([]);
    (prisma.position.count as any).mockResolvedValueOnce(0);

    await getPositions({ status: "open" });

    expect(prisma.position.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "open" } }),
    );
    expect(prisma.position.count).toHaveBeenCalledWith({
      where: { status: "open" },
    });
  });

  it("getPositions has no status filter for all", async () => {
    (prisma.position.findMany as any).mockResolvedValueOnce([]);
    (prisma.position.count as any).mockResolvedValueOnce(0);

    await getPositions({ status: "all", search: "dev" });

    expect(prisma.position.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { title: { contains: "dev", mode: "insensitive" } },
      }),
    );
  });

  it("getOpenPositionsForSelect returns the open positions by title", async () => {
    (prisma.position.findMany as any).mockResolvedValueOnce([]);

    await getOpenPositionsForSelect();

    expect(prisma.position.findMany).toHaveBeenCalledWith({
      where: { status: "open" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  });
});

describe("getPositionSetupStatus", () => {
  it("tags every collection it counts and the position", async () => {
    (prisma.position.findUnique as any).mockResolvedValueOnce(null);

    await getPositionSetupStatus("pos-1");

    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith(
      "positions",
      "scorecards",
      "quizzes",
      "interview-guides",
      "positions-pos-1",
    );
    expect(prisma.position.findUnique).toHaveBeenCalledWith({
      where: { id: "pos-1" },
      select: {
        id: true,
        _count: { select: { quizzes: true, interviewGuides: true } },
        scorecard: {
          select: {
            _count: { select: { criteria: { where: { archivedAt: null } } } },
          },
        },
      },
    });
  });

  it("returns null for a missing position", async () => {
    (prisma.position.findUnique as any).mockResolvedValueOnce(null);

    expect(await getPositionSetupStatus("nope")).toBeNull();
  });

  it("turns the counts into the setup steps", async () => {
    (prisma.position.findUnique as any).mockResolvedValueOnce({
      id: "pos-1",
      _count: { quizzes: 2, interviewGuides: 0 },
      scorecard: { _count: { criteria: 3 } },
    });

    expect(await getPositionSetupStatus("pos-1")).toEqual({
      steps: [
        { key: "details", done: true },
        { key: "scorecard", done: true },
        { key: "quiz", done: true },
        { key: "guide", done: false },
      ],
      missing: ["guide"],
      complete: false,
    });
  });

  it("counts a scorecard without active criteria (or no scorecard) as missing", async () => {
    (prisma.position.findUnique as any).mockResolvedValueOnce({
      id: "pos-1",
      _count: { quizzes: 1, interviewGuides: 1 },
      scorecard: { _count: { criteria: 0 } },
    });
    expect((await getPositionSetupStatus("pos-1"))?.missing).toEqual([
      "scorecard",
    ]);

    (prisma.position.findUnique as any).mockResolvedValueOnce({
      id: "pos-1",
      _count: { quizzes: 1, interviewGuides: 1 },
      scorecard: null,
    });
    expect((await getPositionSetupStatus("pos-1"))?.complete).toBe(false);
  });
});

describe("getPositionCoverage", () => {
  it("returns null for a missing position and tags every source", async () => {
    (prisma.position.findUnique as any).mockResolvedValueOnce(null);

    expect(await getPositionCoverage("p1")).toBeNull();

    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith(
      "positions",
      "scorecards",
      "quizzes",
      "questions",
      "interview-guides",
      "positions-p1",
    );
  });

  it("maps the criteria, the quiz links, the guide questions and the guides", async () => {
    (prisma.position.findUnique as any).mockResolvedValueOnce({
      scorecard: {
        criteria: [
          { id: "c1", name: "Leadership", priority: "must", order: 0 },
          { id: "c2", name: "React", priority: "nice", order: 1 },
        ],
      },
      quizzes: [{ quizQuestions: [{ criterionIds: ["c1"] }] }],
      interviewGuides: [
        {
          id: "g1",
          round: 1,
          sections: [{ questions: [{ criterionIds: ["c1", "c2"] }] }],
        },
        { id: "g2", round: 2, sections: [{ questions: [] }] },
      ],
    });

    const coverage = await getPositionCoverage("p1");

    expect(coverage?.rows).toEqual([
      {
        criterionId: "c1",
        name: "Leadership",
        priority: "must",
        quizQuestionCount: 1,
        guideQuestionCount: 1,
        total: 2,
        uncovered: false,
      },
      {
        criterionId: "c2",
        name: "React",
        priority: "nice",
        quizQuestionCount: 0,
        guideQuestionCount: 1,
        total: 1,
        uncovered: false,
      },
    ]);
    expect(coverage?.uncovered).toEqual([]);
    expect(coverage?.guides).toEqual([
      { id: "g1", round: 1 },
      { id: "g2", round: 2 },
    ]);
  });

  it("reads the active criteria in order and the guides by round", async () => {
    (prisma.position.findUnique as any).mockResolvedValueOnce(null);

    await getPositionCoverage("p1");

    const select = (prisma.position.findUnique as any).mock.calls.at(-1)[0].select;
    expect(select.scorecard.select.criteria).toMatchObject({
      where: { archivedAt: null },
      orderBy: { order: "asc" },
    });
    expect(select.interviewGuides.orderBy).toEqual([
      { round: "asc" },
      { id: "asc" },
    ]);
  });
});
