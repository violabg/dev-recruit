import {
  getCandidateQuizData,
  getAssessmentByToken,
  getAssessmentDetail,
  getAssessmentsByQuiz,
  getAssessmentsStatus,
  getCompletedAssessmentsCount,
  getFilteredAssessments,
  getQuizAssignmentData,
  getRecentAssessmentIds,
  mapAssessmentListItem,
  mapAssignedAssessment,
} from "@/lib/data/assessments";
import prisma from "@/lib/prisma";
import { describe, expect, it } from "vitest";

describe("assessments data layer", () => {
  it("mapAssignedAssessment maps prisma record correctly", () => {
    const record: any = {
      id: "i1",
      token: "t1",
      status: "pending",
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      startedAt: null,
      completedAt: null,
      candidate: {
        id: "c1",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      },
      quiz: { id: "q1", title: "Quiz 1" },
    };

    const mapped = mapAssignedAssessment(record as any);
    expect(mapped.id).toBe("i1");
    expect(mapped.candidateName).toBe("Jane Doe");
    expect(mapped.quizTitle).toBe("Quiz 1");
  });

  it("mapAssessmentListItem maps full relations correctly", () => {
    const record: any = {
      id: "i2",
      token: "t2",
      status: "completed",
      startedAt: new Date("2020-01-01T00:00:00.000Z"),
      completedAt: new Date("2020-01-01T01:00:00.000Z"),
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      candidateId: "c2",
      candidate: {
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
      },
      quizId: "q2",
      quiz: {
        title: "Quiz 2",
        timeLimit: 30,
        position: { id: "p1", title: "Dev", skills: ["js"] },
      },
    };

    const mapped = mapAssessmentListItem(record as any);
    expect(mapped.id).toBe("i2");
    expect(mapped.positionTitle).toBe("Dev");
    expect(mapped.positionSkills).toEqual(["js"]);
  });

  it("getFilteredAssessments returns paginated results", async () => {
    const fakeRecords = Array.from({ length: 2 }).map((_, i) => ({
      id: `i${i}`,
      token: `t${i}`,
      status: i % 2 === 0 ? "completed" : "pending",
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      candidateId: `c${i}`,
      candidate: { firstName: "A", lastName: "B", email: "a@b" },
      quizId: `q${i}`,
      quiz: {
        title: `Quiz ${i}`,
        timeLimit: 10,
        position: { id: "p1", title: "P", skills: [] },
      },
    }));

    (prisma.assessment.findMany as any).mockResolvedValue(fakeRecords);
    (prisma.assessment.count as any).mockResolvedValue(2);

    const result = await getFilteredAssessments({ page: 1, pageSize: 10 });
    expect(result.assessments.length).toBe(2);
    expect(result.totalCount).toBe(2);
    expect(result.currentPage).toBe(1);
  });

  it("getQuizAssignmentData returns quiz assignment data", async () => {
    const fakeQuiz = {
      id: "q1",
      title: "Quiz 1",
      positionId: "p1",
      timeLimit: 30,
      createdBy: "u1",
      position: { id: "p1", title: "Position 1" },
    };
    const fakeAssessments = [
      {
        id: "i1",
        createdAt: new Date(),
        candidate: {
          id: "c1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        quiz: { id: "q1", title: "Quiz 1" },
      },
    ];
    const fakeApplications = [
      {
        stage: "applied",
        candidate: {
          id: "c2",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
        },
      },
    ];

    (prisma.quiz.findUnique as any).mockResolvedValue(fakeQuiz);
    (prisma.assessment.findMany as any).mockResolvedValue(fakeAssessments);
    (prisma.application.findMany as any).mockResolvedValue(fakeApplications);

    const result = await getQuizAssignmentData("q1");
    expect(result).toBeTruthy();
    expect(result?.quiz.id).toBe("q1");
    expect(result?.assignedAssessments.length).toBe(1);
    expect(result?.unassignedCandidates.length).toBe(1);
  });

  it("getCandidateQuizData returns candidate quiz data", async () => {
    const fakeCandidate = {
      id: "c1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      applications: [
        {
          id: "a1",
          stage: "applied",
          position: { id: "p1", title: "Position 1" },
        },
      ],
    };
    const fakeAssessments = [
      {
        id: "i1",
        token: "t1",
        status: "pending",
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        candidateId: "c1",
        quiz: {
          id: "q1",
          title: "Quiz 1",
          createdAt: new Date(),
          timeLimit: 30,
          positionId: "p1",
        },
      },
    ];
    const fakeQuizzes = [
      {
        id: "q2",
        title: "Quiz 2",
        createdAt: new Date(),
        timeLimit: 20,
        positionId: "p1",
        position: { title: "Position 1" },
      },
    ];

    (prisma.candidate.findUnique as any).mockResolvedValue(fakeCandidate);
    (prisma.assessment.findMany as any).mockResolvedValue(fakeAssessments);
    (prisma.quiz.findMany as any).mockResolvedValue(fakeQuizzes);

    const result = await getCandidateQuizData("c1");
    expect(result).toBeTruthy();
    expect(result?.candidate.id).toBe("c1");
    expect(result?.assignedAssessments.length).toBe(1);
    expect(result?.availableQuizzes.length).toBe(1);
  });

  it("getAssessmentByToken returns assessment data", async () => {
    const fakeAssessment = {
      id: "i1",
      token: "t1",
      status: "in_progress",
      answers: { q1: "answer" },
      startedAt: new Date(),
      quiz: {
        id: "q1",
        title: "Quiz 1",
        createdAt: new Date(),
        position: {
          id: "p1",
          title: "Pos",
          experienceLevel: "junior",
          description: "desc",
          skills: ["js"],
        },
        quizQuestions: [
          {
            order: 1,
            question: {
              id: "qst1",
              type: "multiple_choice",
              question: "Q?",
              options: ["a", "b"],
              correctAnswer: 0,
            },
          },
        ],
      },
      candidate: {
        id: "c1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      },
    };

    (prisma.assessment.findUnique as any).mockResolvedValue(fakeAssessment);

    const result = await getAssessmentByToken("t1");
    expect(result).toBeTruthy();
    expect(result?.assessment.token).toBe("t1");
    expect(result?.quiz.id).toBe("q1");
    expect(result?.candidate.id).toBe("c1");
  });

  it("getAssessmentDetail returns detailed assessment data", async () => {
    const fakeAssessment = {
      id: "i1",
      token: "t1",
      status: "completed",
      startedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date(),
      answers: { q1: "answer" },
      quiz: {
        id: "q1",
        title: "Quiz 1",
        createdAt: new Date(),
        position: {
          id: "p1",
          title: "Pos",
          experienceLevel: "junior",
          description: "desc",
          skills: ["js"],
        },
        quizQuestions: [
          {
            order: 1,
            question: {
              id: "qst1",
              type: "multiple_choice",
              question: "Q?",
              options: ["a", "b"],
              correctAnswer: 0,
            },
          },
        ],
      },
      candidate: {
        id: "c1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      },
    };

    (prisma.assessment.findFirst as any).mockResolvedValue(fakeAssessment);

    const result = await getAssessmentDetail("i1");
    expect(result).toBeTruthy();
    expect(result?.assessment.id).toBe("i1");
    expect(result?.quiz.id).toBe("q1");
  });

  it("getCompletedAssessmentsCount returns count", async () => {
    (prisma.assessment.count as any).mockResolvedValue(5);

    const result = await getCompletedAssessmentsCount();
    expect(result).toBe(5);
  });

  it("getAssessmentsByQuiz returns assessments for quiz", async () => {
    const fakeAssessments = [
      {
        id: "i1",
        token: "t1",
        status: "pending",
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        candidate: {
          id: "c1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        quiz: { id: "q1", title: "Quiz 1" },
      },
    ];

    (prisma.assessment.findMany as any).mockResolvedValue(fakeAssessments);

    const result = await getAssessmentsByQuiz("q1");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("i1");
  });

  it("getRecentAssessmentIds returns recent IDs", async () => {
    const fakeAssessments = [{ id: "i1" }, { id: "i2" }];

    (prisma.assessment.findMany as any).mockResolvedValue(fakeAssessments);

    const result = await getRecentAssessmentIds(2);
    expect(result).toEqual(["i1", "i2"]);
  });

  it("getAssessmentsStatus returns status counts", async () => {
    const fakeAssessments = [
      { status: "completed" },
      { status: "completed" },
      { status: "pending" },
    ];

    (prisma.assessment.findMany as any).mockResolvedValue(fakeAssessments);

    const result = await getAssessmentsStatus();
    expect(result.completed).toBe(2);
    expect(result.pending).toBe(1);
  });

  it("getQuizAssignmentData offers only open applications, with their stage", async () => {
    (prisma.quiz.findUnique as any).mockResolvedValueOnce({
      id: "q1",
      title: "Quiz 1",
      positionId: "p1",
      timeLimit: null,
      createdBy: "u1",
      position: { id: "p1", title: "Position 1" },
    });
    (prisma.assessment.findMany as any).mockResolvedValueOnce([]);
    (prisma.application.findMany as any).mockResolvedValueOnce([
      {
        stage: "screening",
        candidate: {
          id: "c2",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
        },
      },
    ]);

    const result = await getQuizAssignmentData("q1");

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          positionId: "p1",
          stage: { notIn: ["rejected", "withdrawn"] },
          candidateId: { notIn: [] },
        },
      }),
    );
    expect(result?.unassignedCandidates).toEqual([
      { id: "c2", name: "Jane Smith", email: "jane@example.com", stage: "screening" },
    ]);
  });

  it("getCandidateQuizData returns the applications and quizzes with their position", async () => {
    (prisma.candidate.findUnique as any).mockResolvedValueOnce({
      id: "c1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      applications: [
        { id: "a1", stage: "assessment", position: { id: "p1", title: "Dev" } },
      ],
    });
    (prisma.assessment.findMany as any).mockResolvedValueOnce([]);
    (prisma.quiz.findMany as any).mockResolvedValueOnce([
      {
        id: "q1",
        title: "React",
        createdAt: new Date("2026-01-01"),
        timeLimit: 30,
        positionId: "p1",
        position: { title: "Dev" },
      },
    ]);

    const result = await getCandidateQuizData("c1");

    expect(prisma.candidate.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          applications: expect.objectContaining({
            where: { stage: { notIn: ["rejected", "withdrawn"] } },
          }),
        }),
      }),
    );
    expect(result).toEqual({
      candidate: { id: "c1", name: "John Doe", email: "john@example.com" },
      applications: [
        { id: "a1", positionId: "p1", positionTitle: "Dev", stage: "assessment" },
      ],
      availableQuizzes: [
        {
          id: "q1",
          title: "React",
          createdAt: "2026-01-01T00:00:00.000Z",
          timeLimit: 30,
          positionId: "p1",
          positionTitle: "Dev",
        },
      ],
      assignedAssessments: [],
    });
  });

  it("getCandidateQuizData returns null only for a missing candidate", async () => {
    (prisma.candidate.findUnique as any).mockResolvedValueOnce(null);
    expect(await getCandidateQuizData("nope")).toBeNull();

    (prisma.candidate.findUnique as any).mockResolvedValueOnce({
      id: "c1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      applications: [],
    });
    (prisma.assessment.findMany as any).mockResolvedValueOnce([]);
    (prisma.quiz.findMany as any).mockResolvedValueOnce([]);

    expect(await getCandidateQuizData("c1")).toMatchObject({
      applications: [],
      availableQuizzes: [],
    });
  });
});
