import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    application: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    assessment: { findMany: vi.fn() },
    evaluation: { findFirst: vi.fn() },
    quiz: { findMany: vi.fn() },
    position: { findMany: vi.fn() },
    scorecardCriterion: { findMany: vi.fn() },
    interview: { findMany: vi.fn(async () => []) },
  },
}));

vi.mock("@/lib/services/application-decisions", () => ({
  loadApplicationDecision: vi.fn(),
}));

import {
  getActionCenterData,
  getApplicationDecision,
  getApplicationDetail,
  getApplicationsByPosition,
  getFilteredApplications,
  getRecentApplicationIds,
} from "@/lib/data/applications";
import prisma from "@/lib/prisma";
import { loadApplicationDecision } from "@/lib/services/application-decisions";
import { cacheLife, cacheTag } from "next/cache";

const db = prisma as any;

const detailRow = {
  id: "app1",
  stage: "screening",
  stageChangedAt: new Date("2026-01-02"),
  createdAt: new Date("2026-01-01"),
  candidateId: "cand1",
  positionId: "pos1",
  owner: { id: "u1", name: "Laura" },
  candidate: {
    id: "cand1",
    firstName: "Mario",
    lastName: "Rossi",
    email: "mario@example.com",
    resumeUrl: "https://r2/cv.pdf",
    doNotContact: false,
    doNotContactNote: null,
  },
  position: { id: "pos1", title: "Dev", experienceLevel: "senior", status: "open" },
  assessments: [],
  interviews: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getApplicationDetail", () => {
  it("returns null for a missing application", async () => {
    db.application.findUnique.mockResolvedValueOnce(null);

    expect(await getApplicationDetail("nope")).toBeNull();
    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith(
      "candidates",
      "positions",
      "assessments",
      "evaluations",
      "quizzes",
      "scorecards",
      "interviews",
    );
  });

  it("resolves the CV assessment per criterion with names, order and archived flag", async () => {
    db.application.findUnique.mockResolvedValueOnce(detailRow);
    db.evaluation.findFirst.mockResolvedValueOnce({
      id: "e1",
      fitScore: 7,
      evaluation: "Buono",
      strengths: [],
      weaknesses: [],
      recommendation: null,
      createdAt: new Date("2026-01-03"),
      criteriaAssessment: {
        "c-comm": { score: null, evidence: "" },
        "c-react": { score: 4, evidence: "Progetti React" },
        "c-deleted": { score: 2, evidence: "Criterio eliminato" },
      },
    });
    db.scorecardCriterion.findMany.mockResolvedValueOnce([
      {
        id: "c-react",
        name: "React",
        category: "technical",
        priority: "must",
        expectedLevel: 4,
        archivedAt: null,
      },
      {
        id: "c-comm",
        name: "Comunicazione",
        category: "soft",
        priority: "nice",
        expectedLevel: 3,
        archivedAt: new Date("2026-01-04"),
      },
      {
        id: "c-unassessed",
        name: "Node",
        category: "technical",
        priority: "nice",
        expectedLevel: 2,
        archivedAt: null,
      },
    ]);
    db.assessment.findMany.mockResolvedValueOnce([]);
    db.quiz.findMany.mockResolvedValueOnce([]);

    const detail = await getApplicationDetail("app1");

    expect(db.evaluation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ criteriaAssessment: true }),
      }),
    );
    // Active and archived criteria of the position scorecard, in order
    expect(db.scorecardCriterion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scorecard: { positionId: "pos1" } },
        orderBy: { order: "asc" },
      }),
    );
    expect(detail?.resumeEvaluation?.criteriaAssessment).toEqual([
      {
        criterionId: "c-react",
        name: "React",
        category: "technical",
        priority: "must",
        expectedLevel: 4,
        archived: false,
        score: 4,
        evidence: "Progetti React",
      },
      {
        criterionId: "c-comm",
        name: "Comunicazione",
        category: "soft",
        priority: "nice",
        expectedLevel: 3,
        archived: true,
        score: null,
        evidence: "",
      },
    ]);
  });

  it("reads criteriaAssessment as null when missing or invalid", async () => {
    for (const stored of [null, { "c-1": { score: 9, evidence: "" } }]) {
      db.application.findUnique.mockResolvedValueOnce(detailRow);
      db.evaluation.findFirst.mockResolvedValueOnce({
        id: "e1",
        fitScore: 7,
        evaluation: null,
        strengths: [],
        weaknesses: [],
        recommendation: null,
        createdAt: new Date("2026-01-03"),
        criteriaAssessment: stored,
      });
      db.assessment.findMany.mockResolvedValueOnce([]);
      db.quiz.findMany.mockResolvedValueOnce([]);

      const detail = await getApplicationDetail("app1");

      expect(detail?.resumeEvaluation?.criteriaAssessment).toBeNull();
    }
    expect(db.scorecardCriterion.findMany).not.toHaveBeenCalled();
  });

  it("loads the resume evaluation and the quizzes not yet sent", async () => {
    db.application.findUnique.mockResolvedValueOnce(detailRow);
    const resumeEvaluation = {
      id: "e1",
      fitScore: 7,
      evaluation: "Buono",
      strengths: [],
      weaknesses: [],
      recommendation: null,
      createdAt: new Date("2026-01-03"),
    };
    db.evaluation.findFirst.mockResolvedValueOnce(resumeEvaluation);
    db.assessment.findMany.mockResolvedValueOnce([{ quizId: "q-sent" }]);
    db.quiz.findMany.mockResolvedValueOnce([
      { id: "q-new", title: "React", timeLimit: 30, createdAt: new Date() },
    ]);

    const detail = await getApplicationDetail("app1");

    expect(cacheTag).toHaveBeenCalledWith("candidate-cand1", "positions-pos1");
    expect(db.evaluation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { candidateId: "cand1", positionId: "pos1", assessmentId: null },
      }),
    );
    expect(db.assessment.findMany).toHaveBeenCalledWith({
      where: { candidateId: "cand1" },
      select: { quizId: true },
    });
    expect(db.quiz.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { positionId: "pos1", id: { notIn: ["q-sent"] } },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(detail).toMatchObject({
      id: "app1",
      stage: "screening",
      owner: { id: "u1", name: "Laura" },
      candidate: { id: "cand1" },
      position: { id: "pos1", status: "open" },
      resumeEvaluation,
      availableQuizzes: [{ id: "q-new" }],
    });
    expect(detail).not.toHaveProperty("candidateId");
  });
});

describe("getApplicationDecision", () => {
  it("delegates to the decision loader with the prisma client and tags every source", async () => {
    const decision = {
      id: "app1",
      candidateId: "cand1",
      positionId: "pos1",
    } as any;
    vi.mocked(loadApplicationDecision).mockResolvedValueOnce(decision);

    expect(await getApplicationDecision("app1")).toBe(decision);

    expect(loadApplicationDecision).toHaveBeenCalledWith(prisma, "app1");
    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith(
      "candidates",
      "positions",
      "assessments",
      "evaluations",
      "quizzes",
      "questions",
      "scorecards",
      "interviews",
    );
    expect(cacheTag).toHaveBeenCalledWith("candidate-cand1", "positions-pos1");
  });

  it("adds no entity tag for a missing application", async () => {
    vi.mocked(loadApplicationDecision).mockResolvedValueOnce(null);

    expect(await getApplicationDecision("nope")).toBeNull();
    expect(cacheTag).toHaveBeenCalledTimes(1);
  });
});

describe("getApplicationsByPosition", () => {
  it("orders by stage change and maps the test count", async () => {
    db.application.findMany.mockResolvedValueOnce([
      {
        id: "app1",
        stage: "assessment",
        stageChangedAt: new Date("2026-01-02"),
        owner: null,
        candidate: {
          id: "c1",
          firstName: "Mario",
          lastName: "Rossi",
          email: "m@x.it",
          doNotContact: true,
        },
        _count: { assessments: 2 },
      },
    ]);

    const cards = await getApplicationsByPosition("pos1");

    expect(cacheTag).toHaveBeenCalledWith(
      "candidates",
      "positions",
      "assessments",
      "positions-pos1",
    );
    expect(db.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { positionId: "pos1" },
        orderBy: { stageChangedAt: "desc" },
      }),
    );
    expect(cards).toEqual([
      {
        id: "app1",
        stage: "assessment",
        stageChangedAt: new Date("2026-01-02"),
        owner: null,
        candidate: {
          id: "c1",
          firstName: "Mario",
          lastName: "Rossi",
          email: "m@x.it",
          doNotContact: true,
        },
        assessmentCount: 2,
      },
    ]);
  });
});

describe("getFilteredApplications", () => {
  it("lists everything without filters", async () => {
    db.application.findMany.mockResolvedValueOnce([]);
    db.application.count.mockResolvedValueOnce(0);

    const result = await getFilteredApplications();

    expect(cacheTag).toHaveBeenCalledWith("candidates", "positions");
    expect(db.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { stageChangedAt: "desc" },
        skip: 0,
      }),
    );
    expect(result).toEqual({
      applications: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });

  it("filters by stage, position, owner and search", async () => {
    db.application.findMany.mockResolvedValueOnce([]);
    db.application.count.mockResolvedValueOnce(25);

    const result = await getFilteredApplications({
      search: " mario ",
      stage: "interview",
      positionId: "pos1",
      ownerId: "u1",
      page: 2,
      pageSize: 10,
    });

    const where = {
      stage: "interview",
      positionId: "pos1",
      ownerId: "u1",
      candidate: {
        OR: [
          { firstName: { contains: "mario", mode: "insensitive" } },
          { lastName: { contains: "mario", mode: "insensitive" } },
          { email: { contains: "mario", mode: "insensitive" } },
        ],
      },
    };
    expect(db.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, skip: 10, take: 10 }),
    );
    expect(db.application.count).toHaveBeenCalledWith({ where });
    expect(result).toMatchObject({
      totalCount: 25,
      currentPage: 2,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });
  });
});

describe("getActionCenterData", () => {
  it("lists tests to evaluate, open applications and incomplete positions", async () => {
    db.assessment.findMany.mockResolvedValueOnce([
      {
        id: "a1",
        completedAt: new Date("2026-01-05"),
        quiz: { title: "React" },
        application: {
          id: "app1",
          ownerId: "u1",
          candidate: { firstName: "Mario", lastName: "Rossi" },
          position: { title: "Dev" },
        },
      },
    ]);
    db.application.findMany.mockResolvedValueOnce([
      {
        id: "app2",
        ownerId: null,
        stage: "screening",
        stageChangedAt: new Date("2026-01-01"),
        candidate: { firstName: "Anna", lastName: "Bianchi" },
        position: { title: "QA" },
      },
    ]);
    db.position.findMany.mockResolvedValueOnce([
      {
        id: "pos9",
        title: "Ops",
        status: "draft",
        _count: { quizzes: 0, interviewGuides: 1 },
        scorecard: { _count: { criteria: 2 } },
      },
    ]);

    const people = {
      ownerId: "u1",
      candidate: { firstName: "Mario", lastName: "Rossi" },
      position: { title: "Dev" },
    };
    db.interview.findMany
      .mockResolvedValueOnce([
        {
          id: "int-draft",
          round: 1,
          scheduledAt: new Date("2026-01-10T09:00:00Z"),
          participants: [{ userId: "u1" }, { userId: "u2" }],
          application: { id: "app1", ...people },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "int-done",
          round: 2,
          participants: [
            { userId: "u1", user: { name: "Laura" } },
            { userId: "u2", user: { name: "Piero" } },
            { userId: "u3", user: { name: "Sara" } },
          ],
          feedback: [{ interviewerId: "u2" }],
          application: { id: "app1", ...people },
        },
      ]);

    const data = await getActionCenterData();

    expect(cacheLife).toHaveBeenCalledWith("minutes");
    expect(cacheTag).toHaveBeenCalledWith(
      "candidates",
      "positions",
      "assessments",
      "evaluations",
      "quizzes",
      "scorecards",
      "interview-guides",
      "interviews",
    );
    expect(db.assessment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "completed",
          evaluation: null,
          application: { stage: { notIn: ["rejected", "withdrawn"] } },
        },
        orderBy: { completedAt: "asc" },
      }),
    );
    expect(db.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          stage: {
            in: ["applied", "screening", "assessment", "interview", "decision", "offer"],
          },
        },
      }),
    );
    expect(db.position.findMany).toHaveBeenCalledWith({
      where: { status: { in: ["draft", "open"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        _count: { select: { quizzes: true, interviewGuides: true } },
        scorecard: {
          select: {
            _count: { select: { criteria: { where: { archivedAt: null } } } },
          },
        },
      },
    });
    expect(data).toEqual({
      assessmentsToEvaluate: [
        {
          assessmentId: "a1",
          applicationId: "app1",
          ownerId: "u1",
          candidateName: "Mario Rossi",
          positionTitle: "Dev",
          quizTitle: "React",
          completedAt: new Date("2026-01-05"),
        },
      ],
      openApplications: [
        {
          applicationId: "app2",
          ownerId: null,
          candidateName: "Anna Bianchi",
          positionTitle: "QA",
          stage: "screening",
          stageChangedAt: new Date("2026-01-01"),
        },
      ],
      positionsWithIncompleteSetup: [
        { positionId: "pos9", title: "Ops", status: "draft", missing: ["quiz"] },
      ],
      interviewsWithoutKit: [
        {
          interviewId: "int-draft",
          applicationId: "app1",
          ownerId: "u1",
          participantIds: ["u1", "u2"],
          candidateName: "Mario Rossi",
          positionTitle: "Dev",
          round: 1,
          scheduledAt: new Date("2026-01-10T09:00:00Z"),
        },
      ],
      // One row per participant without a submitted scorecard
      feedbackToFill: [
        {
          interviewId: "int-done",
          applicationId: "app1",
          ownerId: "u1",
          interviewerId: "u1",
          interviewerName: "Laura",
          candidateName: "Mario Rossi",
          positionTitle: "Dev",
          round: 2,
        },
        {
          interviewId: "int-done",
          applicationId: "app1",
          ownerId: "u1",
          interviewerId: "u3",
          interviewerName: "Sara",
          candidateName: "Mario Rossi",
          positionTitle: "Dev",
          round: 2,
        },
      ],
    });
    // Scheduled interviews of open applications whose kit is not ready
    expect(db.interview.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          status: "scheduled",
          OR: [{ kit: { is: null } }, { kit: { status: { not: "ready" } } }],
          application: { stage: { notIn: ["rejected", "withdrawn"] } },
        },
        orderBy: { scheduledAt: "asc" },
      }),
    );
    // Completed interviews of open applications, submitted feedback only
    const completedQuery = db.interview.findMany.mock.calls[1][0];
    expect(completedQuery.where).toEqual({
      status: "completed",
      application: { stage: { notIn: ["rejected", "withdrawn"] } },
    });
    expect(completedQuery.select.feedback.where).toEqual({
      submittedAt: { not: null },
    });
  });
});

describe("getRecentApplicationIds", () => {
  it("returns the newest ids", async () => {
    db.application.findMany.mockResolvedValueOnce([{ id: "a" }, { id: "b" }]);

    expect(await getRecentApplicationIds(2)).toEqual(["a", "b"]);
    expect(cacheTag).toHaveBeenCalledWith("candidates");
    expect(db.application.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { id: true },
    });
  });
});

describe("getActionCenterData: incomplete setup", () => {
  const position = (
    id: string,
    counts: { criteria: number | null; quizzes: number; guides: number },
  ) => ({
    id,
    title: `Posizione ${id}`,
    status: "open",
    _count: { quizzes: counts.quizzes, interviewGuides: counts.guides },
    scorecard:
      counts.criteria === null
        ? null
        : { _count: { criteria: counts.criteria } },
  });

  beforeEach(() => {
    db.assessment.findMany.mockResolvedValueOnce([]);
    db.application.findMany.mockResolvedValueOnce([]);
  });

  it("lists every missing part in the order scorecard, quiz, guide and skips complete positions", async () => {
    db.position.findMany.mockResolvedValueOnce([
      // quiz and guide, no scorecard row at all
      position("only-scorecard", { criteria: null, quizzes: 1, guides: 1 }),
      // scorecard whose criteria are all archived: still missing
      position("archived-only", { criteria: 0, quizzes: 2, guides: 1 }),
      position("only-guide", { criteria: 3, quizzes: 1, guides: 0 }),
      position("all-missing", { criteria: null, quizzes: 0, guides: 0 }),
      position("complete", { criteria: 2, quizzes: 1, guides: 2 }),
    ]);

    const data = await getActionCenterData();

    expect(data.positionsWithIncompleteSetup).toEqual([
      {
        positionId: "only-scorecard",
        title: "Posizione only-scorecard",
        status: "open",
        missing: ["scorecard"],
      },
      {
        positionId: "archived-only",
        title: "Posizione archived-only",
        status: "open",
        missing: ["scorecard"],
      },
      {
        positionId: "only-guide",
        title: "Posizione only-guide",
        status: "open",
        missing: ["guide"],
      },
      {
        positionId: "all-missing",
        title: "Posizione all-missing",
        status: "open",
        missing: ["scorecard", "quiz", "guide"],
      },
    ]);
  });
});

describe("getApplicationDetail interviews", () => {
  it("maps the interview facts (submitted feedback only) by round", async () => {
    db.application.findUnique.mockResolvedValueOnce({
      ...detailRow,
      interviews: [
        {
          id: "int-1",
          round: 1,
          status: "completed",
          scheduledAt: new Date("2026-01-03"),
          startedAt: new Date("2026-01-03T09:00:00Z"),
          endedAt: new Date("2026-01-03T10:00:00Z"),
          kit: { status: "ready" },
          participants: [{ userId: "u1" }, { userId: "u2" }],
          feedback: [{ interviewerId: "u1" }],
        },
        {
          id: "int-2",
          round: 2,
          status: "scheduled",
          scheduledAt: new Date("2026-01-09"),
          startedAt: null,
          endedAt: null,
          kit: null,
          participants: [{ userId: "u1" }],
          feedback: [],
        },
      ],
    });
    db.evaluation.findFirst.mockResolvedValueOnce(null);
    db.assessment.findMany.mockResolvedValueOnce([]);
    db.quiz.findMany.mockResolvedValueOnce([]);

    const detail = await getApplicationDetail("app1");

    expect(detail?.interviews).toEqual([
      {
        id: "int-1",
        round: 1,
        status: "completed",
        scheduledAt: new Date("2026-01-03"),
        startedAt: new Date("2026-01-03T09:00:00Z"),
        endedAt: new Date("2026-01-03T10:00:00Z"),
        kitStatus: "ready",
        participantIds: ["u1", "u2"],
        submittedInterviewerIds: ["u1"],
      },
      {
        id: "int-2",
        round: 2,
        status: "scheduled",
        scheduledAt: new Date("2026-01-09"),
        startedAt: null,
        endedAt: null,
        kitStatus: null,
        participantIds: ["u1"],
        submittedInterviewerIds: [],
      },
    ]);
    const select = db.application.findUnique.mock.calls[0][0].select;
    expect(select.interviews.orderBy).toEqual({ round: "asc" });
    expect(select.interviews.select.feedback.where).toEqual({
      submittedAt: { not: null },
    });
    expect(JSON.stringify(select.interviews)).not.toContain("notes");
  });
});
