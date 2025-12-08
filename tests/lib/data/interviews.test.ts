import {
  getCandidateQuizData,
  getCompletedInterviewsCount,
  getFilteredInterviews,
  getInterviewByToken,
  getInterviewDetail,
  getInterviewsByQuiz,
  getInteviewsStatus,
  getQuizAssignmentData,
  getRecentInterviewIds,
  mapAssignedInterview,
  mapInterviewListItem,
} from "@/lib/data/interviews";
import prisma from "@/lib/prisma";
import { describe, expect, it } from "vitest";

describe("interviews data layer", () => {
  it("mapAssignedInterview maps prisma record correctly", () => {
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

    const mapped = mapAssignedInterview(record as any);
    expect(mapped.id).toBe("i1");
    expect(mapped.candidateName).toBe("Jane Doe");
    expect(mapped.quizTitle).toBe("Quiz 1");
  });

  it("mapInterviewListItem maps full relations correctly", () => {
    const record: any = {
      id: "i2",
      token: "t2",
      status: "completed",
      startedAt: new Date("2020-01-01T00:00:00.000Z"),
      completedAt: new Date("2020-01-01T01:00:00.000Z"),
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      score: 85,
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

    const mapped = mapInterviewListItem(record as any);
    expect(mapped.id).toBe("i2");
    expect(mapped.score).toBe(85);
    expect(mapped.positionTitle).toBe("Dev");
    expect(mapped.positionSkills).toEqual(["js"]);
  });

  it("getFilteredInterviews returns paginated results", async () => {
    const fakeRecords = Array.from({ length: 2 }).map((_, i) => ({
      id: `i${i}`,
      token: `t${i}`,
      status: i % 2 === 0 ? "completed" : "pending",
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      score: null,
      candidateId: `c${i}`,
      candidate: { firstName: "A", lastName: "B", email: "a@b" },
      quizId: `q${i}`,
      quiz: {
        title: `Quiz ${i}`,
        timeLimit: 10,
        position: { id: "p1", title: "P", skills: [] },
      },
    }));

    (prisma.interview.findMany as any).mockResolvedValue(fakeRecords);
    (prisma.interview.count as any).mockResolvedValue(2);

    const result = await getFilteredInterviews({ page: 1, pageSize: 10 });
    expect(result.interviews.length).toBe(2);
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
    const fakeInterviews = [
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
    const fakeCandidates = [
      {
        id: "c2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        status: "active",
      },
    ];

    (prisma.quiz.findUnique as any).mockResolvedValue(fakeQuiz);
    (prisma.interview.findMany as any).mockResolvedValue(fakeInterviews);
    (prisma.candidate.findMany as any).mockResolvedValue(fakeCandidates);

    const result = await getQuizAssignmentData("q1");
    expect(result).toBeTruthy();
    expect(result?.quiz.id).toBe("q1");
    expect(result?.assignedInterviews.length).toBe(1);
    expect(result?.unassignedCandidates.length).toBe(1);
  });

  it("getCandidateQuizData returns candidate quiz data", async () => {
    const fakeCandidate = {
      id: "c1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      status: "active",
      positionId: "p1",
      position: { id: "p1", title: "Position 1" },
    };
    const fakeInterviews = [
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
      },
    ];

    (prisma.candidate.findUnique as any).mockResolvedValue(fakeCandidate);
    (prisma.interview.findMany as any).mockResolvedValue(fakeInterviews);
    (prisma.quiz.findMany as any).mockResolvedValue(fakeQuizzes);

    const result = await getCandidateQuizData("c1");
    expect(result).toBeTruthy();
    expect(result?.candidate.id).toBe("c1");
    expect(result?.assignedInterviews.length).toBe(1);
    expect(result?.availableQuizzes.length).toBe(1);
  });

  it("getInterviewByToken returns interview data", async () => {
    const fakeInterview = {
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

    (prisma.interview.findUnique as any).mockResolvedValue(fakeInterview);

    const result = await getInterviewByToken("t1");
    expect(result).toBeTruthy();
    expect(result?.interview.token).toBe("t1");
    expect(result?.quiz.id).toBe("q1");
    expect(result?.candidate.id).toBe("c1");
  });

  it("getInterviewDetail returns detailed interview data", async () => {
    const fakeInterview = {
      id: "i1",
      token: "t1",
      status: "completed",
      startedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date(),
      score: 85,
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

    (prisma.interview.findFirst as any).mockResolvedValue(fakeInterview);

    const result = await getInterviewDetail("i1");
    expect(result).toBeTruthy();
    expect(result?.interview.id).toBe("i1");
    expect(result?.interview.score).toBe(85);
    expect(result?.quiz.id).toBe("q1");
  });

  it("getCompletedInterviewsCount returns count", async () => {
    (prisma.interview.count as any).mockResolvedValue(5);

    const result = await getCompletedInterviewsCount();
    expect(result).toBe(5);
  });

  it("getInterviewsByQuiz returns interviews for quiz", async () => {
    const fakeInterviews = [
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

    (prisma.interview.findMany as any).mockResolvedValue(fakeInterviews);

    const result = await getInterviewsByQuiz("q1");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("i1");
  });

  it("getRecentInterviewIds returns recent IDs", async () => {
    const fakeInterviews = [{ id: "i1" }, { id: "i2" }];

    (prisma.interview.findMany as any).mockResolvedValue(fakeInterviews);

    const result = await getRecentInterviewIds(2);
    expect(result).toEqual(["i1", "i2"]);
  });

  it("getInteviewsStatus returns status counts", async () => {
    const fakeInterviews = [
      { status: "completed" },
      { status: "completed" },
      { status: "pending" },
    ];

    (prisma.interview.findMany as any).mockResolvedValue(fakeInterviews);

    const result = await getInteviewsStatus();
    expect(result.completed).toBe(2);
    expect(result.pending).toBe(1);
  });
});
