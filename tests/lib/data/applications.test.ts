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
    behavioralRubric: { findUnique: vi.fn() },
  },
}));

import {
  getActionCenterData,
  getApplicationDetail,
  getApplicationEvaluationSummary,
  getApplicationsByPosition,
  getFilteredApplications,
  getRecentApplicationIds,
} from "@/lib/data/applications";
import prisma from "@/lib/prisma";
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
    );
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

describe("getApplicationEvaluationSummary", () => {
  it("returns null for a missing application", async () => {
    db.application.findUnique.mockResolvedValueOnce(null);

    expect(await getApplicationEvaluationSummary("nope")).toBeNull();
  });

  it("reads the latest evaluation of this application and the rubric", async () => {
    db.application.findUnique.mockResolvedValueOnce({
      id: "app1",
      candidateId: "cand1",
      positionId: "pos1",
    });
    db.evaluation.findFirst.mockResolvedValueOnce({
      id: "ev1",
      assessmentId: "a1",
      quizScore: 80,
      fitScore: 8,
      interviewNotes: "Ottimo",
      redFlags: [],
      standoutMoments: ["Chiaro"],
      hireRecommendation: "yes",
      nextSteps: null,
      assessment: { quiz: { title: "React" } },
    });
    const rubric = {
      communicationScore: 4,
      collaborationScore: 4,
      problemSolvingScore: 4,
      cultureFitScore: 4,
      leadershipScore: null,
      strengthExamples: [],
      improvementAreas: [],
      overallComments: null,
    };
    db.behavioralRubric.findUnique.mockResolvedValueOnce(rubric);

    const summary = await getApplicationEvaluationSummary("app1");

    expect(cacheTag).toHaveBeenCalledWith(
      "evaluations",
      "assessments",
      "candidates",
      "positions",
      "quizzes",
      "behavioral-rubrics",
    );
    expect(cacheTag).toHaveBeenCalledWith("behavioral-rubric-cand1-pos1");
    expect(db.evaluation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assessment: { applicationId: "app1" } },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(db.behavioralRubric.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          candidateId_positionId: { candidateId: "cand1", positionId: "pos1" },
        },
      }),
    );
    expect(summary).toEqual({
      applicationId: "app1",
      candidateId: "cand1",
      positionId: "pos1",
      assessmentEvaluation: {
        id: "ev1",
        assessmentId: "a1",
        quizTitle: "React",
        quizScore: 80,
        fitScore: 8,
        interviewNotes: "Ottimo",
        redFlags: [],
        standoutMoments: ["Chiaro"],
        hireRecommendation: "yes",
        nextSteps: null,
      },
      rubric,
    });
  });

  it("has no assessment evaluation when no test was evaluated", async () => {
    db.application.findUnique.mockResolvedValueOnce({
      id: "app1",
      candidateId: "cand1",
      positionId: "pos1",
    });
    db.evaluation.findFirst.mockResolvedValueOnce(null);
    db.behavioralRubric.findUnique.mockResolvedValueOnce(null);

    expect(await getApplicationEvaluationSummary("app1")).toMatchObject({
      assessmentEvaluation: null,
      rubric: null,
    });
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
      { id: "pos9", title: "Ops", status: "draft" },
    ]);

    const data = await getActionCenterData();

    expect(cacheLife).toHaveBeenCalledWith("minutes");
    expect(cacheTag).toHaveBeenCalledWith(
      "candidates",
      "positions",
      "assessments",
      "evaluations",
      "quizzes",
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
    expect(db.position.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ["draft", "open"] }, quizzes: { none: {} } },
      }),
    );
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
      interviewsWithoutKit: [],
      feedbackToFill: [],
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
