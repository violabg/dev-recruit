import {
  buildDecisionWeights,
  computeDecisionScore,
  DISAGREEMENT_GAP,
  isDisagreement,
  mean,
  testScoresByCriterion,
  toFivePointScale,
  type CriterionSources,
  type DecisionCriterion,
  type InterviewerCriterionScore,
} from "@/lib/utils/decision-score";
import { describe, expect, it } from "vitest";

const criterion = (
  id: string,
  overrides: Partial<DecisionCriterion> = {},
): DecisionCriterion => ({
  id,
  name: `Criterio ${id}`,
  category: "technical",
  priority: "nice",
  expectedLevel: 3,
  weight: 3,
  archived: false,
  order: 0,
  ...overrides,
});

const interviewer = (
  score: number,
  overrides: Partial<InterviewerCriterionScore> = {},
): InterviewerCriterionScore => ({
  feedbackId: `fb-${score}`,
  interviewId: "int-1",
  round: 1,
  interviewerId: `u-${score}`,
  interviewerName: "Intervistatore",
  score,
  evidence: null,
  ...overrides,
});

const sources = (
  criterionId: string,
  overrides: Partial<Omit<CriterionSources, "criterionId">> = {},
): CriterionSources => ({
  criterionId,
  cv: null,
  test: null,
  interviewers: [],
  ...overrides,
});

const answer = (score: number) => ({ score, strengths: [], weaknesses: [] });

describe("toFivePointScale", () => {
  it.each([
    [0, 10, 1],
    [10, 10, 5],
    [5, 10, 3],
    [7, 10, 3.8],
    [70, 100, 3.8],
  ])("maps %s of %s to %s", (value, max, expected) => {
    expect(toFivePointScale(value, max)).toBe(expected);
  });

  it("clamps above the maximum and below zero", () => {
    expect(toFivePointScale(150, 100)).toBe(5);
    expect(toFivePointScale(-1, 10)).toBe(1);
  });

  it("returns 1 for a non-positive maximum", () => {
    expect(toFivePointScale(3, 0)).toBe(1);
  });
});

describe("mean", () => {
  it("is null for an empty list", () => {
    expect(mean([])).toBeNull();
  });

  it("averages with one decimal place", () => {
    expect(mean([3, 4])).toBe(3.5);
    expect(mean([3, 4, 4])).toBe(3.7);
  });
});

describe("isDisagreement", () => {
  it("uses a gap of 2", () => {
    expect(DISAGREEMENT_GAP).toBe(2);
  });

  it("signals a gap of at least 2 between two or more scores", () => {
    expect(isDisagreement([3, 5])).toBe(true);
    expect(isDisagreement([1, 3, 2])).toBe(true);
  });

  it("does not signal agreeing scores or a single score", () => {
    expect(isDisagreement([3, 4])).toBe(false);
    expect(isDisagreement([4])).toBe(false);
    expect(isDisagreement([])).toBe(false);
  });
});

describe("computeDecisionScore", () => {
  it("averages the interviewers, then the available sources with equal weight", () => {
    const score = computeDecisionScore({
      criteria: [criterion("c1")],
      sources: [
        sources("c1", {
          cv: { score: 4, evidence: "CV" },
          interviewers: [interviewer(3), interviewer(5)],
        }),
      ],
      decisionWeights: null,
    });

    expect(score.rows[0]).toMatchObject({
      cv: 4,
      test: null,
      interviewerMean: 4,
      value: 4,
      hasEvidence: true,
      disagreement: true,
    });
  });

  it("averages cv, test and interviewer mean when all exist", () => {
    const score = computeDecisionScore({
      criteria: [criterion("c1")],
      sources: [
        sources("c1", {
          cv: { score: 5, evidence: "" },
          test: { score: 3, questionCount: 2 },
          interviewers: [interviewer(4)],
        }),
      ],
      decisionWeights: null,
    });

    expect(score.rows[0].value).toBe(4);
    expect(score.rows[0].disagreement).toBe(false);
  });

  it("weights the overall only over criteria with evidence", () => {
    const score = computeDecisionScore({
      criteria: [
        criterion("c1", { weight: 3 }),
        criterion("c2", { weight: 1 }),
        criterion("c3", { weight: 5 }),
      ],
      sources: [
        sources("c1", { cv: { score: 4, evidence: "" } }),
        sources("c2", { cv: { score: 2, evidence: "" } }),
      ],
      decisionWeights: null,
    });

    expect(score.overall).toBe(3.5);
    expect(score.rows[2]).toMatchObject({ value: null, hasEvidence: false });
  });

  it("keeps the input order and treats a missing source entry as no evidence", () => {
    const score = computeDecisionScore({
      criteria: [criterion("b"), criterion("a")],
      sources: [sources("a", { cv: { score: 2, evidence: "" } })],
      decisionWeights: null,
    });

    expect(score.rows.map((row) => row.criterion.id)).toEqual(["b", "a"]);
    expect(score.rows[0]).toMatchObject({
      cv: null,
      test: null,
      interviewerMean: null,
      value: null,
    });
  });

  it("has no overall when no criterion has evidence", () => {
    const score = computeDecisionScore({
      criteria: [criterion("c1"), criterion("c2")],
      sources: [],
      decisionWeights: null,
    });

    expect(score.overall).toBeNull();
  });

  it("warns on a must criterion below the expected level without changing the overall", () => {
    const data = (priority: "must" | "nice") =>
      computeDecisionScore({
        criteria: [
          criterion("c1", { priority, expectedLevel: 4, name: "React" }),
          criterion("c2"),
        ],
        sources: [
          sources("c1", { cv: { score: 2, evidence: "" } }),
          sources("c2", { cv: { score: 5, evidence: "" } }),
        ],
        decisionWeights: null,
      });

    const must = data("must");
    const nice = data("nice");

    expect(must.warnings).toEqual([
      {
        criterionId: "c1",
        criterionName: "React",
        kind: "below_expected",
        value: 2,
        expectedLevel: 4,
      },
    ]);
    expect(must.rows[0].warning).toEqual(must.warnings[0]);
    expect(must.overall).toBe(nice.overall);
    expect(must.overall).toBe(3.5);
    expect(nice.warnings).toEqual([]);
    expect(nice.rows[0].warning).toBeNull();
  });

  it("warns on a must criterion without evidence", () => {
    const score = computeDecisionScore({
      criteria: [criterion("c1", { priority: "must", expectedLevel: 3 })],
      sources: [],
      decisionWeights: null,
    });

    expect(score.warnings).toEqual([
      expect.objectContaining({
        criterionId: "c1",
        kind: "no_evidence",
        value: null,
        expectedLevel: 3,
      }),
    ]);
  });

  it("does not warn on a must criterion at or above the expected level", () => {
    const score = computeDecisionScore({
      criteria: [criterion("c1", { priority: "must", expectedLevel: 3 })],
      sources: [sources("c1", { cv: { score: 3, evidence: "" } })],
      decisionWeights: null,
    });

    expect(score.warnings).toEqual([]);
  });

  it("uses the stored weights of a decided application and excludes criteria missing from them", () => {
    const score = computeDecisionScore({
      criteria: [
        criterion("c1", { weight: 1 }),
        criterion("c2", { weight: 5 }),
        criterion("c3", { weight: 5 }),
      ],
      sources: [
        sources("c1", { cv: { score: 4, evidence: "" } }),
        sources("c2", { cv: { score: 2, evidence: "" } }),
        sources("c3", { cv: { score: 1, evidence: "" } }),
      ],
      decisionWeights: { c1: 3, c2: 1 },
    });

    expect(score.weightsSource).toBe("decision");
    expect(score.rows.map((row) => row.weight)).toEqual([3, 1, null]);
    expect(score.overall).toBe(3.5);
  });

  it("uses the live scorecard weights of an undecided application", () => {
    const score = computeDecisionScore({
      criteria: [criterion("c1", { weight: 1 }), criterion("c2", { weight: 3 })],
      sources: [
        sources("c1", { cv: { score: 5, evidence: "" } }),
        sources("c2", { cv: { score: 1, evidence: "" } }),
      ],
      decisionWeights: null,
    });

    expect(score.weightsSource).toBe("scorecard");
    expect(score.rows.map((row) => row.weight)).toEqual([1, 3]);
    expect(score.overall).toBe(2);
  });

  it("has no overall when the weights of the criteria with evidence sum to zero", () => {
    const score = computeDecisionScore({
      criteria: [criterion("c1")],
      sources: [sources("c1", { cv: { score: 4, evidence: "" } })],
      decisionWeights: {},
    });

    expect(score.overall).toBeNull();
  });
});

describe("buildDecisionWeights", () => {
  it("maps every criterion id to its weight", () => {
    expect(
      buildDecisionWeights([
        criterion("c1", { weight: 2 }),
        criterion("c2", { weight: 5, archived: true }),
      ]),
    ).toEqual({ c1: 2, c2: 5 });
  });
});

describe("testScoresByCriterion", () => {
  it("averages the 0-10 scores of the answered linked questions, then converts them", () => {
    const result = testScoresByCriterion({
      knownCriterionIds: new Set(["c1", "c2"]),
      links: [
        { questionId: "q1", criterionIds: ["c1"] },
        { questionId: "q2", criterionIds: ["c1", "c2"] },
      ],
      answerEvaluations: { q1: answer(7), q2: answer(8) },
    });

    // c1: (7 + 8) / 2 = 7.5 -> 1 + 4 * 0.75 = 4
    expect(result.get("c1")).toEqual({ score: 4, questionCount: 2 });
    expect(result.get("c2")).toEqual({ score: 4.2, questionCount: 1 });
  });

  it("ignores criterion ids that are not in the scorecard", () => {
    const result = testScoresByCriterion({
      knownCriterionIds: new Set(["c1"]),
      links: [{ questionId: "q1", criterionIds: ["deleted", "c1"] }],
      answerEvaluations: { q1: answer(10) },
    });

    expect([...result.keys()]).toEqual(["c1"]);
  });

  it("ignores unanswered questions", () => {
    const result = testScoresByCriterion({
      knownCriterionIds: new Set(["c1", "c2"]),
      links: [
        { questionId: "q1", criterionIds: ["c1"] },
        { questionId: "q2", criterionIds: ["c1", "c2"] },
      ],
      answerEvaluations: { q1: answer(0) },
    });

    expect(result.get("c1")).toEqual({ score: 1, questionCount: 1 });
    expect(result.has("c2")).toBe(false);
  });

  it("returns an empty map without answer details", () => {
    expect(
      testScoresByCriterion({
        knownCriterionIds: new Set(["c1"]),
        links: [{ questionId: "q1", criterionIds: ["c1"] }],
        answerEvaluations: null,
      }).size,
    ).toBe(0);
  });
});
