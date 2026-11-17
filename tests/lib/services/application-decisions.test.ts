import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: { $transaction: vi.fn() },
}));

vi.mock("@/lib/services/applications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/services/applications")>()),
  advanceApplicationStage: vi.fn(),
}));

import prisma from "@/lib/prisma";
import {
  loadApplicationDecision,
  recordApplicationDecision,
} from "@/lib/services/application-decisions";
import { advanceApplicationStage } from "@/lib/services/applications";

const db = prisma as any;

const applicationRow = (overrides: Record<string, unknown> = {}) => ({
  id: "app-1",
  stage: "decision",
  candidateId: "cand-1",
  positionId: "pos-1",
  decision: null,
  decisionRationale: null,
  decidedAt: null,
  decisionWeights: null,
  decider: null,
  candidate: { id: "cand-1", firstName: "Mario", lastName: "Rossi" },
  position: { id: "pos-1", title: "Sviluppatore" },
  ...overrides,
});

const criterionRow = (
  id: string,
  overrides: Record<string, unknown> = {},
) => ({
  id,
  name: `Criterio ${id}`,
  category: "technical",
  priority: "must",
  expectedLevel: 3,
  weight: 3,
  archivedAt: null,
  order: 0,
  ...overrides,
});

type ClientOverrides = {
  application?: unknown;
  criteria?: unknown[];
  resumeEvaluation?: unknown;
  assessment?: unknown;
  interviews?: unknown[];
};

/** Hand-built client: every read the loader may do, plus the ones it must not */
function buildClient(overrides: ClientOverrides = {}) {
  const evaluationFindFirst = vi
    .fn()
    .mockResolvedValueOnce(overrides.resumeEvaluation ?? null);

  return {
    application: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          "application" in overrides ? overrides.application : applicationRow(),
        ),
      update: vi.fn(),
    },
    scorecardCriterion: {
      findMany: vi.fn().mockResolvedValue(overrides.criteria ?? []),
    },
    evaluation: { findFirst: evaluationFindFirst },
    assessment: {
      findFirst: vi.fn().mockResolvedValue(overrides.assessment ?? null),
    },
    interview: {
      findMany: vi.fn().mockResolvedValue(overrides.interviews ?? []),
    },
    kitItemNote: { findMany: vi.fn() },
    interviewerFeedback: { findMany: vi.fn() },
  };
}

const interviewRow = (overrides: Record<string, unknown> = {}) => ({
  id: "int-1",
  round: 1,
  status: "completed",
  scheduledAt: new Date("2026-01-10"),
  participants: [{ userId: "u-1" }, { userId: "u-2" }],
  feedback: [
    {
      id: "fb-1",
      interviewerId: "u-1",
      hireRecommendation: "yes",
      notes: "Buono",
      redFlags: [],
      standoutMoments: [],
      submittedAt: new Date("2026-01-11"),
      interviewer: { name: "Laura" },
      scores: [
        { criterionId: "c1", score: 4, evidence: "Ottimo" },
        { criterionId: "deleted", score: 1, evidence: null },
      ],
    },
  ],
  ...overrides,
});

describe("loadApplicationDecision", () => {
  it("returns null when the application does not exist", async () => {
    const client = buildClient({ application: null });

    expect(await loadApplicationDecision(client as any, "nope")).toBeNull();
    expect(client.scorecardCriterion.findMany).not.toHaveBeenCalled();
  });

  it("reads only submitted scorecards of interviews not cancelled or no-show, and never live notes", async () => {
    const client = buildClient({
      criteria: [criterionRow("c1")],
      interviews: [interviewRow()],
    });

    const decision = await loadApplicationDecision(client as any, "app-1");

    const query = client.interview.findMany.mock.calls[0][0];
    expect(query.where).toEqual({
      applicationId: "app-1",
      status: { notIn: ["cancelled", "no_show"] },
    });
    expect(query.select.feedback.where).toEqual({
      submittedAt: { not: null },
    });
    expect(client.kitItemNote.findMany).not.toHaveBeenCalled();
    expect(client.interviewerFeedback.findMany).not.toHaveBeenCalled();

    expect(decision?.interviews).toEqual([
      expect.objectContaining({
        id: "int-1",
        participantIds: ["u-1", "u-2"],
        submittedInterviewerIds: ["u-1"],
        scorecards: [
          expect.objectContaining({
            feedbackId: "fb-1",
            interviewerName: "Laura",
            hireRecommendation: "yes",
          }),
        ],
      }),
    ]);
    expect(decision?.sources[0].interviewers).toEqual([
      {
        feedbackId: "fb-1",
        interviewId: "int-1",
        round: 1,
        interviewerId: "u-1",
        interviewerName: "Laura",
        score: 4,
        evidence: "Ottimo",
      },
    ]);
  });

  it("chooses the latest completed assessment that has an evaluation", async () => {
    const client = buildClient();

    await loadApplicationDecision(client as any, "app-1");

    expect(client.assessment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          applicationId: "app-1",
          status: "completed",
          evaluation: { isNot: null },
        },
        orderBy: { completedAt: "desc" },
      }),
    );
  });

  it("ignores deleted criterion ids on quiz links, CV entries and interviewer scores", async () => {
    const client = buildClient({
      criteria: [criterionRow("c1")],
      resumeEvaluation: {
        id: "ev-cv",
        fitScore: 8,
        criteriaAssessment: {
          c1: { score: 4, evidence: "React" },
          deleted: { score: 5, evidence: "Vecchio" },
        },
      },
      assessment: {
        id: "as-1",
        quiz: {
          title: "Quiz React",
          quizQuestions: [
            { questionId: "q1", criterionIds: ["deleted"] },
            { questionId: "q2", criterionIds: ["c1"] },
          ],
        },
        evaluation: {
          quizScore: 70,
          answerEvaluations: {
            q1: { score: 10, strengths: [], weaknesses: [] },
            q2: { score: 5, strengths: [], weaknesses: [] },
          },
        },
      },
      interviews: [interviewRow()],
    });

    const decision = await loadApplicationDecision(client as any, "app-1");

    expect(decision?.criteria.map((criterion) => criterion.id)).toEqual(["c1"]);
    expect(decision?.sources).toEqual([
      expect.objectContaining({
        criterionId: "c1",
        cv: { score: 4, evidence: "React" },
        test: { score: 3, questionCount: 1 },
      }),
    ]);
    expect(decision?.sources[0].interviewers).toHaveLength(1);
    expect(decision?.cv).toEqual({
      evaluationId: "ev-cv",
      fitScore: 8,
      global: 4.2,
      perCriterion: true,
    });
    expect(decision?.test).toEqual({
      assessmentId: "as-1",
      quizTitle: "Quiz React",
      quizScore: 70,
      global: 3.8,
      perCriterion: true,
      answerDetailMissing: false,
    });
  });

  it("keeps an archived criterion with evidence, flagged as archived", async () => {
    const client = buildClient({
      criteria: [
        criterionRow("c1"),
        criterionRow("c-archived", { archivedAt: new Date(), order: 1 }),
      ],
      interviews: [
        interviewRow({
          feedback: [
            {
              ...interviewRow().feedback[0],
              scores: [{ criterionId: "c-archived", score: 2, evidence: null }],
            },
          ],
        }),
      ],
    });

    const decision = await loadApplicationDecision(client as any, "app-1");

    expect(decision?.criteria).toEqual([
      expect.objectContaining({ id: "c1", archived: false }),
      expect.objectContaining({ id: "c-archived", archived: true }),
    ]);
    expect(decision?.sources[1].interviewers[0].score).toBe(2);
  });

  it("drops an archived criterion without evidence on this application", async () => {
    const client = buildClient({
      criteria: [
        criterionRow("c1"),
        criterionRow("c-archived", { archivedAt: new Date() }),
      ],
    });

    const decision = await loadApplicationDecision(client as any, "app-1");

    expect(decision?.criteria.map((criterion) => criterion.id)).toEqual(["c1"]);
    expect(decision?.sources.map((source) => source.criterionId)).toEqual([
      "c1",
    ]);
  });

  it("keeps an archived criterion stored in the decision weights", async () => {
    const decidedAt = new Date("2026-02-01");
    const client = buildClient({
      application: applicationRow({
        decision: "offer",
        decisionRationale: "Motivazione valida",
        decidedAt,
        decisionWeights: { c1: 3, "c-archived": 2 },
        decider: { id: "u-9", name: "Giulia" },
      }),
      criteria: [
        criterionRow("c1"),
        criterionRow("c-archived", { archivedAt: new Date() }),
      ],
    });

    const decision = await loadApplicationDecision(client as any, "app-1");

    expect(decision?.criteria.map((criterion) => criterion.id)).toEqual([
      "c1",
      "c-archived",
    ]);
    expect(decision?.recorded).toEqual({
      outcome: "offer",
      rationale: "Motivazione valida",
      decidedAt,
      decidedBy: { id: "u-9", name: "Giulia" },
      weights: { c1: 3, "c-archived": 2 },
    });
  });

  it("reads malformed decision weights as null", async () => {
    const client = buildClient({
      application: applicationRow({ decisionWeights: { c1: 9 } }),
    });

    const decision = await loadApplicationDecision(client as any, "app-1");

    expect(decision?.recorded.weights).toBeNull();
  });

  it("reads an unknown stored outcome as no outcome", async () => {
    const client = buildClient({
      application: applicationRow({ decision: "maybe" }),
    });

    const decision = await loadApplicationDecision(client as any, "app-1");

    expect(decision?.recorded.outcome).toBeNull();
  });

  it("reads an invalid CV criteria assessment as a global CV row", async () => {
    const client = buildClient({
      criteria: [criterionRow("c1")],
      resumeEvaluation: {
        id: "ev-cv",
        fitScore: 5,
        criteriaAssessment: "not-json-object",
      },
    });

    const decision = await loadApplicationDecision(client as any, "app-1");

    expect(decision?.cv).toEqual({
      evaluationId: "ev-cv",
      fitScore: 5,
      global: 3,
      perCriterion: false,
    });
    expect(decision?.sources[0].cv).toBeNull();
  });

  it("marks the test as global when the answer details are missing", async () => {
    const client = buildClient({
      criteria: [criterionRow("c1")],
      assessment: {
        id: "as-1",
        quiz: {
          title: "Quiz",
          quizQuestions: [{ questionId: "q1", criterionIds: ["c1"] }],
        },
        evaluation: { quizScore: null, answerEvaluations: null },
      },
    });

    const decision = await loadApplicationDecision(client as any, "app-1");

    expect(decision?.test).toEqual({
      assessmentId: "as-1",
      quizTitle: "Quiz",
      quizScore: null,
      global: null,
      perCriterion: false,
      answerDetailMissing: true,
    });
  });
});

describe("recordApplicationDecision", () => {
  const params = {
    applicationId: "app-1",
    outcome: "hired" as const,
    rationale: "Motivazione della decisione",
    userId: "user-123",
  };

  let tx: ReturnType<typeof buildClient>;

  beforeEach(() => {
    tx = buildClient({
      criteria: [criterionRow("c1", { weight: 4 }), criterionRow("c2", { weight: 2 })],
    });
    vi.mocked(db.$transaction).mockImplementation(((fn: any) => fn(tx)) as any);
    vi.mocked(advanceApplicationStage).mockResolvedValue({
      applicationId: "app-1",
      candidateId: "cand-1",
      positionId: "pos-1",
      previousStage: "decision",
      stage: "hired",
      changed: true,
      cancelledAssessmentIds: [],
      cancelledInterviewIds: [],
    });
  });

  it("refuses a missing application", async () => {
    tx.application.findUnique.mockResolvedValue(null);

    await expect(recordApplicationDecision(params)).rejects.toThrow(
      "Candidatura non trovata",
    );
    expect(tx.application.update).not.toHaveBeenCalled();
  });

  it.each(["hired", "rejected", "withdrawn"])(
    "refuses a closed application in %s",
    async (stage) => {
      tx.application.findUnique.mockResolvedValue(applicationRow({ stage }));

      await expect(recordApplicationDecision(params)).rejects.toThrow(
        "Candidatura chiusa: riaprila per registrare la decisione",
      );
      expect(tx.application.update).not.toHaveBeenCalled();
      expect(advanceApplicationStage).not.toHaveBeenCalled();
    },
  );

  it("writes the decision with the session user and the weights, then advances the stage in the same transaction", async () => {
    const result = await recordApplicationDecision(params);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.application.update).toHaveBeenCalledWith({
      where: { id: "app-1" },
      data: {
        decision: "hired",
        decisionRationale: "Motivazione della decisione",
        decidedBy: "user-123",
        decidedAt: expect.any(Date),
        decisionWeights: { c1: 4, c2: 2 },
      },
    });
    expect(advanceApplicationStage).toHaveBeenCalledWith(
      tx,
      "app-1",
      "decision_recorded",
      "hired",
    );
    expect(result).toEqual({
      applicationId: "app-1",
      candidateId: "cand-1",
      positionId: "pos-1",
      stage: "hired",
      changed: true,
    });
  });

  it("allows a new decision on an application in offer and returns the stage from the stage rule", async () => {
    tx.application.findUnique.mockResolvedValue(applicationRow({ stage: "offer" }));
    vi.mocked(advanceApplicationStage).mockResolvedValue({
      applicationId: "app-1",
      candidateId: "cand-1",
      positionId: "pos-1",
      previousStage: "offer",
      stage: "offer",
      changed: false,
      cancelledAssessmentIds: [],
      cancelledInterviewIds: [],
    });

    const result = await recordApplicationDecision({
      ...params,
      outcome: "offer",
    });

    expect(tx.application.update).toHaveBeenCalled();
    expect(result).toMatchObject({ stage: "offer", changed: false });
  });
});

describe("recordApplicationDecision with the real stage rule", () => {
  let tx: ReturnType<typeof buildClient>;

  beforeEach(async () => {
    const actual = await vi.importActual<
      typeof import("@/lib/services/applications")
    >("@/lib/services/applications");
    vi.mocked(advanceApplicationStage).mockImplementation(
      actual.advanceApplicationStage,
    );
    tx = buildClient({ criteria: [criterionRow("c1")] });
    vi.mocked(db.$transaction).mockImplementation(((fn: any) => fn(tx)) as any);
  });

  it.each([
    ["interview", "hired"],
    ["decision", "offer"],
    ["offer", "rejected"],
    ["offer", "hired"],
  ] as const)(
    "moves an application in %s to %s and updates stageChangedAt",
    async (stage, outcome) => {
      tx.application.findUnique.mockResolvedValue(applicationRow({ stage }));

      const result = await recordApplicationDecision({
        applicationId: "app-1",
        outcome,
        rationale: "Motivazione della decisione",
        userId: "user-123",
      });

      expect(tx.application.update).toHaveBeenLastCalledWith({
        where: { id: "app-1" },
        data: { stage: outcome, stageChangedAt: expect.any(Date) },
      });
      expect(result).toMatchObject({ stage: outcome, changed: true });
    },
  );
});
