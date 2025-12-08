import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignQuizzesToCandidate,
  type AssignQuizzesToCandidateState,
} from "../../../lib/actions/candidate-quiz-assignment";

// Mock dependencies
vi.mock("../../../lib/prisma", () => ({
  default: {
    candidate: {
      findUnique: vi.fn(),
    },
    quiz: {
      findMany: vi.fn(),
    },
    interview: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("../../../lib/auth-server", () => ({
  requireUser: vi.fn(() =>
    Promise.resolve({ id: "user-123", name: "Test User" })
  ),
}));

vi.mock("../../../lib/utils/token", () => ({
  generateInterviewToken: vi.fn(() => Promise.resolve("test-token-123")),
}));

vi.mock("../../../lib/utils/cache-utils", () => ({
  invalidateInterviewCache: vi.fn(),
}));

vi.mock("../../../lib/schemas", () => ({
  candidateQuizAssignmentSchema: {
    safeParse: vi.fn((data) => ({
      success: true,
      data: {
        quizIds: data.quizIds,
        candidateId: data.candidateId,
      },
    })),
  },
}));

describe("candidate-quiz-assignment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("assignQuizzesToCandidate", () => {
    it("successfully assigns quizzes to candidate", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockFindMany = prisma.quiz.findMany as any;
      const mockFindFirst = prisma.interview.findFirst as any;
      const mockCreate = prisma.interview.create as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario@example.com",
        positionId: "position-123",
      };

      const quizzes = [
        {
          id: "quiz-1",
          title: "JavaScript Quiz",
          positionId: "position-123",
        },
        {
          id: "quiz-2",
          title: "React Quiz",
          positionId: "position-123",
        },
      ];

      mockFindUnique.mockResolvedValueOnce(candidate);
      mockFindMany.mockResolvedValueOnce(quizzes);
      mockFindFirst.mockResolvedValue(null); // No existing interviews
      mockCreate.mockResolvedValue({
        token: "test-token-123",
      });

      const formData = new FormData();
      formData.append("quizIds", "quiz-1");
      formData.append("quizIds", "quiz-2");
      formData.append("candidateId", "candidate-123");

      const prevState: AssignQuizzesToCandidateState = {
        message: "",
      };

      const result = await assignQuizzesToCandidate(prevState, formData);

      expect(result.success).toBe(true);
      expect(result.createdInterviews).toHaveLength(2);
      expect(result.message).toBe("Interviste create con successo.");
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it("returns error when candidate not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      const formData = new FormData();
      formData.append("quizIds", "quiz-1");
      formData.append("candidateId", "invalid-id");

      const prevState: AssignQuizzesToCandidateState = {
        message: "",
      };

      const result = await assignQuizzesToCandidate(prevState, formData);

      expect(result.success).toBeUndefined();
      expect(result.message).toBe("Candidate not found.");
    });

    it("returns error when no valid quizzes selected", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockFindMany = prisma.quiz.findMany as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario@example.com",
        positionId: "position-123",
      };

      mockFindUnique.mockResolvedValueOnce(candidate);
      mockFindMany.mockResolvedValueOnce([]);

      const formData = new FormData();
      formData.append("quizIds", "invalid-quiz");
      formData.append("candidateId", "candidate-123");

      const prevState: AssignQuizzesToCandidateState = {
        message: "",
      };

      const result = await assignQuizzesToCandidate(prevState, formData);

      expect(result.message).toBe("No valid quizzes selected.");
      expect(result.errors?.quizIds).toEqual([
        "Seleziona almeno un quiz valido.",
      ]);
    });

    it("rejects quizzes not matching candidate position", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockFindMany = prisma.quiz.findMany as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario@example.com",
        positionId: "position-123",
      };

      const quizzes = [
        {
          id: "quiz-1",
          title: "JavaScript Quiz",
          positionId: "position-999", // Different position
        },
      ];

      mockFindUnique.mockResolvedValueOnce(candidate);
      mockFindMany.mockResolvedValueOnce(quizzes);

      const formData = new FormData();
      formData.append("quizIds", "quiz-1");
      formData.append("candidateId", "candidate-123");

      const prevState: AssignQuizzesToCandidateState = {
        message: "",
      };

      const result = await assignQuizzesToCandidate(prevState, formData);

      expect(result.message).toBe(
        "Some quizzes are not valid for this candidate's position or you don't have permission."
      );
    });

    it("skips existing interviews and reports errors", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockFindMany = prisma.quiz.findMany as any;
      const mockFindFirst = prisma.interview.findFirst as any;
      const mockCreate = prisma.interview.create as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario@example.com",
        positionId: "position-123",
      };

      const quizzes = [
        {
          id: "quiz-1",
          title: "JavaScript Quiz",
          positionId: "position-123",
        },
        {
          id: "quiz-2",
          title: "React Quiz",
          positionId: "position-123",
        },
      ];

      mockFindUnique.mockResolvedValueOnce(candidate);
      mockFindMany.mockResolvedValueOnce(quizzes);

      // First quiz already has interview
      mockFindFirst.mockResolvedValueOnce({ id: "existing-interview" });
      // Second quiz is new
      mockFindFirst.mockResolvedValueOnce(null);

      mockCreate.mockResolvedValue({
        token: "test-token-123",
      });

      const formData = new FormData();
      formData.append("quizIds", "quiz-1");
      formData.append("quizIds", "quiz-2");
      formData.append("candidateId", "candidate-123");

      const prevState: AssignQuizzesToCandidateState = {
        message: "",
      };

      const result = await assignQuizzesToCandidate(prevState, formData);

      expect(result.createdInterviews).toHaveLength(1);
      expect(result.errors?.general).toHaveLength(1);
      expect(result.errors?.general?.[0]).toContain("già un colloquio");
      expect(result.message).toContain("Alcuni colloqui non sono stati creati");
    });

    it("validates form data", async () => {
      const { candidateQuizAssignmentSchema } = await import(
        "../../../lib/schemas"
      );
      const mockSafeParse = candidateQuizAssignmentSchema.safeParse as any;

      mockSafeParse.mockReturnValueOnce({
        success: false,
        error: {
          flatten: () => ({
            fieldErrors: {
              quizIds: ["Quiz IDs required"],
              candidateId: ["Candidate ID required"],
            },
          }),
        },
      });

      const formData = new FormData();
      const prevState: AssignQuizzesToCandidateState = {
        message: "",
      };

      const result = await assignQuizzesToCandidate(prevState, formData);

      expect(result.message).toBe("Invalid form data.");
      expect(result.errors?.quizIds).toBeDefined();
      expect(result.errors?.candidateId).toBeDefined();
    });

    it("handles missing quiz in map", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockFindMany = prisma.quiz.findMany as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario@example.com",
        positionId: "position-123",
      };

      // Return empty quizzes array but form has quiz IDs
      mockFindUnique.mockResolvedValueOnce(candidate);
      mockFindMany.mockResolvedValueOnce([]);

      const formData = new FormData();
      formData.append("quizIds", "non-existent-quiz");
      formData.append("candidateId", "candidate-123");

      const prevState: AssignQuizzesToCandidateState = {
        message: "",
      };

      const result = await assignQuizzesToCandidate(prevState, formData);

      expect(result.message).toBe("No valid quizzes selected.");
    });

    it("invalidates cache after creating interviews", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidateInterviewCache } = await import(
        "../../../lib/utils/cache-utils"
      );

      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockFindMany = prisma.quiz.findMany as any;
      const mockFindFirst = prisma.interview.findFirst as any;
      const mockCreate = prisma.interview.create as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario@example.com",
        positionId: "position-123",
      };

      const quizzes = [
        {
          id: "quiz-1",
          title: "JavaScript Quiz",
          positionId: "position-123",
        },
      ];

      mockFindUnique.mockResolvedValueOnce(candidate);
      mockFindMany.mockResolvedValueOnce(quizzes);
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        token: "test-token-123",
      });

      const formData = new FormData();
      formData.append("quizIds", "quiz-1");
      formData.append("candidateId", "candidate-123");

      const prevState: AssignQuizzesToCandidateState = {
        message: "",
      };

      await assignQuizzesToCandidate(prevState, formData);

      expect(invalidateInterviewCache).toHaveBeenCalledWith({
        quizId: "quiz-1",
      });
    });

    it("generates unique tokens for each interview", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { generateInterviewToken } = await import(
        "../../../lib/utils/token"
      );

      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockFindMany = prisma.quiz.findMany as any;
      const mockFindFirst = prisma.interview.findFirst as any;
      const mockCreate = prisma.interview.create as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario@example.com",
        positionId: "position-123",
      };

      const quizzes = [
        {
          id: "quiz-1",
          title: "Quiz 1",
          positionId: "position-123",
        },
        {
          id: "quiz-2",
          title: "Quiz 2",
          positionId: "position-123",
        },
      ];

      mockFindUnique.mockResolvedValueOnce(candidate);
      mockFindMany.mockResolvedValueOnce(quizzes);
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ token: "token-123" });

      const formData = new FormData();
      formData.append("quizIds", "quiz-1");
      formData.append("quizIds", "quiz-2");
      formData.append("candidateId", "candidate-123");

      const prevState: AssignQuizzesToCandidateState = {
        message: "",
      };

      await assignQuizzesToCandidate(prevState, formData);

      expect(generateInterviewToken).toHaveBeenCalledTimes(2);
    });
  });
});
