import { beforeEach, describe, expect, it, vi } from "vitest";

// The global Prisma mock has no scorecard delegates
vi.mock("@/lib/prisma", () => ({
  default: {
    scorecardCriterion: { findMany: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
import type { ScorecardCriterionInput } from "@/lib/schemas";
import {
  assertActiveCriteria,
  criterionHasEvidence,
  getActiveCriteria,
  saveScorecard,
} from "@/lib/services/scorecards";

/** Transaction client with every delegate saveScorecard may touch */
function makeTx() {
  return {
    scorecard: { upsert: vi.fn().mockResolvedValue({ id: "sc-1" }) },
    scorecardCriterion: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    evaluation: { findMany: vi.fn().mockResolvedValue([]) },
    criterionScore: { count: vi.fn().mockResolvedValue(0) },
    kitItem: { count: vi.fn().mockResolvedValue(0) },
    interviewKit: { findMany: vi.fn().mockResolvedValue([]) },
    guideQuestion: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    // Must never be written by the scorecard save
    quizQuestion: {
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    application: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

const row = (
  overrides: Partial<ScorecardCriterionInput> = {},
): ScorecardCriterionInput => ({
  name: "React",
  description: "Componenti",
  category: "technical",
  priority: "must",
  weight: 3,
  expectedLevel: 3,
  anchors: { weak: "w", medium: "m", strong: "s" },
  source: "skill",
  ...overrides,
});

const params = (
  criteria: ScorecardCriterionInput[],
): Parameters<typeof saveScorecard>[1] => ({
  positionId: "pos-1",
  criteria,
  userId: "user-1",
});

describe("saveScorecard", () => {
  let tx: ReturnType<typeof makeTx>;

  beforeEach(() => {
    tx = makeTx();
  });

  it("creates the scorecard on the first save and the criteria in order", async () => {
    const result = await saveScorecard(
      tx as any,
      params([row({ name: "React" }), row({ name: "Node", description: "" })]),
    );

    expect(tx.scorecard.upsert).toHaveBeenCalledWith({
      where: { positionId: "pos-1" },
      create: { positionId: "pos-1", createdBy: "user-1" },
      update: {},
      select: { id: true },
    });
    expect(tx.scorecardCriterion.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        name: "React",
        order: 0,
        scorecardId: "sc-1",
        anchors: { weak: "w", medium: "m", strong: "s" },
      }),
    });
    // An empty description is stored as null
    expect(tx.scorecardCriterion.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        name: "Node",
        description: null,
        order: 1,
      }),
    });
    expect(result).toEqual({
      scorecardId: "sc-1",
      created: 2,
      updated: 0,
      deleted: 0,
      archived: 0,
      guidesUnlinked: false,
    });
  });

  it("loads only active criteria and updates the rows with a stored id", async () => {
    tx.scorecardCriterion.findMany.mockResolvedValue([{ id: "c-1" }]);

    const result = await saveScorecard(
      tx as any,
      params([row({ name: "Nuovo" }), row({ id: "c-1", name: "React 19" })]),
    );

    expect(tx.scorecardCriterion.findMany).toHaveBeenCalledWith({
      where: { scorecardId: "sc-1", archivedAt: null },
      select: { id: true },
    });
    expect(tx.scorecardCriterion.update).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: expect.objectContaining({ name: "React 19", order: 1 }),
    });
    expect(tx.scorecardCriterion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Nuovo", order: 0 }),
    });
    expect(result).toMatchObject({ created: 1, updated: 1 });
  });

  it("creates a row whose id is not an active stored criterion", async () => {
    tx.scorecardCriterion.findMany.mockResolvedValue([{ id: "c-1" }]);

    await saveScorecard(tx as any, params([row({ id: "c-1" }), row({ id: "c-x" })]));

    expect(tx.scorecardCriterion.update).toHaveBeenCalledTimes(1);
    expect(tx.scorecardCriterion.create).toHaveBeenCalledTimes(1);
  });

  it("deletes a removed criterion without evidence and unlinks it from the guide questions", async () => {
    tx.scorecardCriterion.findMany.mockResolvedValue([
      { id: "c-1" },
      { id: "c-2" },
    ]);
    tx.guideQuestion.findMany.mockResolvedValue([
      { id: "gq-1", criterionIds: ["c-2", "c-1"] },
      { id: "gq-2", criterionIds: ["c-2"] },
    ]);

    const result = await saveScorecard(tx as any, params([row({ id: "c-1" })]));

    expect(tx.guideQuestion.findMany).toHaveBeenCalledWith({
      where: {
        criterionIds: { has: "c-2" },
        section: { guide: { positionId: "pos-1" } },
      },
      select: { id: true, criterionIds: true },
    });
    expect(tx.guideQuestion.update).toHaveBeenCalledWith({
      where: { id: "gq-1" },
      data: { criterionIds: ["c-1"] },
    });
    expect(tx.guideQuestion.update).toHaveBeenCalledWith({
      where: { id: "gq-2" },
      data: { criterionIds: [] },
    });
    expect(tx.scorecardCriterion.delete).toHaveBeenCalledWith({
      where: { id: "c-2" },
    });
    expect(result).toMatchObject({
      deleted: 1,
      archived: 0,
      guidesUnlinked: true,
    });

    // syncQuizQuestions is the only writer of QuizQuestion
    for (const write of Object.values(tx.quizQuestion)) {
      expect(write).not.toHaveBeenCalled();
    }
  });

  it("reports guidesUnlinked false when no guide question used the deleted criterion", async () => {
    tx.scorecardCriterion.findMany.mockResolvedValue([{ id: "c-2" }]);

    const result = await saveScorecard(tx as any, params([]));

    expect(tx.scorecardCriterion.delete).toHaveBeenCalledWith({
      where: { id: "c-2" },
    });
    expect(tx.guideQuestion.update).not.toHaveBeenCalled();
    expect(result.guidesUnlinked).toBe(false);
  });

  it("archives a removed criterion with evidence instead of deleting it", async () => {
    tx.scorecardCriterion.findMany.mockResolvedValue([{ id: "c-2" }]);
    tx.evaluation.findMany.mockResolvedValue([
      { criteriaAssessment: { "c-2": { score: 3, evidence: "x" } } },
    ]);

    const result = await saveScorecard(tx as any, params([]));

    expect(tx.scorecardCriterion.update).toHaveBeenCalledWith({
      where: { id: "c-2" },
      data: { archivedAt: expect.any(Date) },
    });
    expect(tx.scorecardCriterion.delete).not.toHaveBeenCalled();
    expect(tx.guideQuestion.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({ archived: 1, deleted: 0 });
  });

  it("never touches archived criteria: an archived id in the input is created anew", async () => {
    // Stored ACTIVE criteria only: the archived c-arch is not among them
    tx.scorecardCriterion.findMany.mockResolvedValue([]);

    await saveScorecard(tx as any, params([row({ id: "c-arch" })]));

    expect(tx.scorecardCriterion.update).not.toHaveBeenCalled();
    expect(tx.scorecardCriterion.delete).not.toHaveBeenCalled();
  });

  it("a weight change updates only the criterion row, never the applications", async () => {
    tx.scorecardCriterion.findMany.mockResolvedValue([{ id: "c-1" }]);

    await saveScorecard(tx as any, params([row({ id: "c-1", weight: 5 })]));

    expect(tx.scorecardCriterion.update).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: expect.objectContaining({ weight: 5 }),
    });
    expect(tx.application.update).not.toHaveBeenCalled();
    expect(tx.application.updateMany).not.toHaveBeenCalled();
  });
});

describe("criterionHasEvidence with interviews", () => {
  const params = { criterionId: "c-1", positionId: "pos-1" };

  it("is true with an interviewer criterion score (submitted or not)", async () => {
    const tx = makeTx();
    tx.criterionScore.count.mockResolvedValue(1);

    await expect(criterionHasEvidence(tx as any, params)).resolves.toBe(true);
    expect(tx.criterionScore.count).toHaveBeenCalledWith({
      where: { criterionId: "c-1" },
    });
    expect(tx.kitItem.count).not.toHaveBeenCalled();
  });

  it("is true with a kit item of the position citing it", async () => {
    const tx = makeTx();
    tx.kitItem.count.mockResolvedValue(2);

    await expect(criterionHasEvidence(tx as any, params)).resolves.toBe(true);
    expect(tx.kitItem.count).toHaveBeenCalledWith({
      where: {
        criterionIds: { has: "c-1" },
        kit: { interview: { application: { positionId: "pos-1" } } },
      },
    });
  });

  it("is true with a kit hypothesis citing it, ignoring invalid shapes", async () => {
    const tx = makeTx();
    tx.interviewKit.findMany.mockResolvedValue([
      { hypotheses: null },
      { hypotheses: { criterionId: "c-1" } },
      { hypotheses: ["c-1", null, { criterionId: "c-2" }] },
      { hypotheses: [{ criterionId: "c-1", hypothesis: "x", howToVerify: "y" }] },
    ]);

    await expect(criterionHasEvidence(tx as any, params)).resolves.toBe(true);
    expect(tx.interviewKit.findMany).toHaveBeenCalledWith({
      where: { interview: { application: { positionId: "pos-1" } } },
      select: { hypotheses: true },
    });
  });

  it("is false when no score, kit item or hypothesis cites it", async () => {
    const tx = makeTx();
    tx.interviewKit.findMany.mockResolvedValue([
      { hypotheses: [{ criterionId: "c-2" }] },
      { hypotheses: "c-1" },
    ]);

    await expect(criterionHasEvidence(tx as any, params)).resolves.toBe(false);
  });
});

describe("criterionHasEvidence", () => {
  it("is true when a CV evaluation of the position assessed the criterion", async () => {
    const tx = makeTx();
    tx.evaluation.findMany.mockResolvedValue([
      { criteriaAssessment: null },
      { criteriaAssessment: { "c-1": { score: null, evidence: "" } } },
    ]);

    await expect(
      criterionHasEvidence(tx as any, { criterionId: "c-1", positionId: "pos-1" }),
    ).resolves.toBe(true);
    expect(tx.evaluation.findMany).toHaveBeenCalledWith({
      where: { positionId: "pos-1", assessmentId: null },
      select: { criteriaAssessment: true },
    });
  });

  it("is false when no CV evaluation has an entry for it", async () => {
    const tx = makeTx();
    tx.evaluation.findMany.mockResolvedValue([
      { criteriaAssessment: null },
      { criteriaAssessment: { "c-9": { score: 2, evidence: "" } } },
      { criteriaAssessment: ["c-1"] },
    ]);

    await expect(
      criterionHasEvidence(tx as any, { criterionId: "c-1", positionId: "pos-1" }),
    ).resolves.toBe(false);
  });
});

describe("getActiveCriteria", () => {
  it("reads only the non-archived criteria of the position, in order", async () => {
    vi.mocked(prisma.scorecardCriterion.findMany).mockResolvedValue([
      {
        id: "c-1",
        name: "React",
        description: null,
        category: "technical",
        priority: "must",
        weight: 3,
        expectedLevel: 4,
      },
    ] as any);

    const result = await getActiveCriteria("pos-1");

    expect(prisma.scorecardCriterion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scorecard: { positionId: "pos-1" }, archivedAt: null },
        orderBy: { order: "asc" },
      }),
    );
    expect(result).toEqual([
      {
        id: "c-1",
        name: "React",
        description: null,
        category: "technical",
        priority: "must",
        weight: 3,
        expectedLevel: 4,
      },
    ]);
  });
});

describe("assertActiveCriteria", () => {
  beforeEach(() => {
    vi.mocked(prisma.scorecardCriterion.findMany).mockResolvedValue([
      { id: "c-1" },
      { id: "c-2" },
    ] as any);
  });

  it("passes on an empty list without reading", async () => {
    await expect(assertActiveCriteria("pos-1", [])).resolves.toBeUndefined();
    expect(prisma.scorecardCriterion.findMany).not.toHaveBeenCalled();
  });

  it("passes when every id is an active criterion", async () => {
    await expect(
      assertActiveCriteria("pos-1", ["c-1", "c-2"]),
    ).resolves.toBeUndefined();
  });

  it("throws on a foreign or archived id", async () => {
    await expect(assertActiveCriteria("pos-1", ["c-1", "c-x"])).rejects.toThrow(
      "Uno o più criteri selezionati non appartengono alla scheda della posizione",
    );
  });
});
