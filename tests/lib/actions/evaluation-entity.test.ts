import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCandidateEvaluation,
  createInterviewEvaluation,
  deleteEvaluation,
  updateEvaluationNotes,
} from "../../../lib/actions/evaluation-entity";

// Mock dependencies
vi.mock("../../../lib/prisma", () => ({
  default: {
    interview: {
      findUnique: vi.fn(),
    },
    candidate: {
      findUnique: vi.fn(),
    },
    position: {
      findUnique: vi.fn(),
    },
    evaluation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../../../lib/auth-server", () => ({
  requireUser: vi.fn(() =>
    Promise.resolve({ id: "user-123", name: "Test User" })
  ),
}));

vi.mock("../../../lib/utils/cache-utils", () => ({
  invalidateEvaluationCache: vi.fn(),
}));

vi.mock("@ai-sdk/groq");
vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn((config) => config),
  },
  wrapLanguageModel: vi.fn((config) => config.model),
}));

vi.mock("../../../lib/utils", () => ({
  getOptimalModel: vi.fn(() => "test-model"),
  isDevelopment: true,
}));

vi.mock("../../../lib/services/logger", () => ({
  logger: {
    error: vi.fn(),
  },
  aiLogger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock unpdf
vi.mock("unpdf", () => ({
  extractText: vi.fn(() =>
    Promise.resolve({
      text: "Senior Software Developer with 10 years of experience in JavaScript, React, Node.js. Strong background in system design and database optimization.",
    })
  ),
  getDocumentProxy: vi.fn(() => Promise.resolve({})),
}));

describe("evaluation-entity actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      })
    ) as any;
  });

  describe("createInterviewEvaluation", () => {
    it("creates interview evaluation successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;
      const mockCreate = prisma.evaluation.create as any;

      const interview = {
        id: "interview-123",
        quiz: { title: "JavaScript Quiz" },
        evaluation: null,
      };

      const aiEvaluation = {
        evaluation: "Good performance",
        strengths: ["Strong JS knowledge"],
        weaknesses: ["Needs more practice with async"],
        recommendation: "Hire",
        fitScore: 85,
      };

      mockFindUnique.mockResolvedValueOnce(interview);
      mockCreate.mockResolvedValueOnce({
        id: "eval-123",
        title: "JavaScript Quiz",
        evaluation: aiEvaluation.evaluation,
      });

      const result = await createInterviewEvaluation(
        "interview-123",
        aiEvaluation,
        90
      );

      expect(result.id).toBe("eval-123");
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "JavaScript Quiz",
          interviewId: "interview-123",
          evaluation: "Good performance",
          fitScore: 9, // Converted from 85/10
          quizScore: 90,
        }),
      });
    });

    it("throws error when interview not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      const aiEvaluation = {
        evaluation: "Test",
        strengths: [],
        weaknesses: [],
        recommendation: "Test",
        fitScore: 50,
      };

      await expect(
        createInterviewEvaluation("invalid-id", aiEvaluation)
      ).rejects.toThrow("Colloquio non trovato");
    });

    it("throws error when evaluation already exists", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;

      const interview = {
        id: "interview-123",
        quiz: { title: "Quiz" },
        evaluation: { id: "existing-eval" },
      };

      mockFindUnique.mockResolvedValueOnce(interview);

      const aiEvaluation = {
        evaluation: "Test",
        strengths: [],
        weaknesses: [],
        recommendation: "Test",
        fitScore: 50,
      };

      await expect(
        createInterviewEvaluation("interview-123", aiEvaluation)
      ).rejects.toThrow("Esiste già una valutazione per questo colloquio");
    });

    it("converts fitScore from 0-100 to 0-10", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;
      const mockCreate = prisma.evaluation.create as any;

      const interview = {
        id: "interview-123",
        quiz: { title: "Test Quiz" },
        evaluation: null,
      };

      mockFindUnique.mockResolvedValueOnce(interview);
      mockCreate.mockResolvedValueOnce({ id: "eval-123" });

      const aiEvaluation = {
        evaluation: "Test",
        strengths: [],
        weaknesses: [],
        recommendation: "Test",
        fitScore: 73, // Should become 7
      };

      await createInterviewEvaluation("interview-123", aiEvaluation);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fitScore: 7,
        }),
      });
    });

    it("invalidates evaluation cache after creation", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidateEvaluationCache } = await import(
        "../../../lib/utils/cache-utils"
      );

      const mockFindUnique = prisma.interview.findUnique as any;
      const mockCreate = prisma.evaluation.create as any;

      const interview = {
        id: "interview-123",
        quiz: { title: "Quiz" },
        evaluation: null,
      };

      mockFindUnique.mockResolvedValueOnce(interview);
      mockCreate.mockResolvedValueOnce({ id: "eval-123" });

      const aiEvaluation = {
        evaluation: "Test",
        strengths: [],
        weaknesses: [],
        recommendation: "Test",
        fitScore: 50,
      };

      await createInterviewEvaluation("interview-123", aiEvaluation);

      expect(invalidateEvaluationCache).toHaveBeenCalledWith({
        evaluationId: "eval-123",
        interviewId: "interview-123",
      });
    });
  });

  describe("createCandidateEvaluation", () => {
    it("creates candidate evaluation successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { generateText } = await import("ai");

      const mockCandidateFindUnique = prisma.candidate.findUnique as any;
      const mockPositionFindUnique = prisma.position.findUnique as any;
      const mockEvaluationFindFirst = prisma.evaluation.findFirst as any;
      const mockCreate = prisma.evaluation.create as any;
      const mockGenerateObject = generateText as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        resumeUrl: "https://example.com/resume.pdf",
      };

      const position = {
        id: "position-123",
        title: "Senior Developer",
        description: "Looking for senior dev",
        experienceLevel: "senior",
        skills: ["JavaScript", "React"],
        softSkills: ["Communication"],
      };

      mockCandidateFindUnique.mockResolvedValueOnce(candidate);
      mockPositionFindUnique.mockResolvedValueOnce(position);
      mockEvaluationFindFirst.mockResolvedValueOnce(null);

      mockGenerateObject.mockResolvedValueOnce({
        output: {
          evaluation: "Strong candidate",
          strengths: ["Experienced"],
          weaknesses: ["Limited React"],
          recommendation: "Interview",
          fitScore: 80,
        },
      });

      mockCreate.mockResolvedValueOnce({
        id: "eval-123",
        title: "Senior Developer",
      });

      const result = await createCandidateEvaluation(
        "candidate-123",
        "position-123"
      );

      expect(result.id).toBe("eval-123");
      expect(mockCreate).toHaveBeenCalled();
    });

    it("throws error when candidate not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      await expect(
        createCandidateEvaluation("invalid-id", "position-123")
      ).rejects.toThrow("Candidato non trovato");
    });

    it("throws error when candidate has no resume", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        resumeUrl: null,
      };

      mockFindUnique.mockResolvedValueOnce(candidate);

      await expect(
        createCandidateEvaluation("candidate-123", "position-123")
      ).rejects.toThrow("non ha un curriculum caricato");
    });

    it("throws error when position not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCandidateFindUnique = prisma.candidate.findUnique as any;
      const mockPositionFindUnique = prisma.position.findUnique as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        resumeUrl: "https://example.com/resume.pdf",
      };

      mockCandidateFindUnique.mockResolvedValueOnce(candidate);
      mockPositionFindUnique.mockResolvedValueOnce(null);

      await expect(
        createCandidateEvaluation("candidate-123", "invalid-position")
      ).rejects.toThrow("Posizione non trovata");
    });

    it("throws error when evaluation already exists", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCandidateFindUnique = prisma.candidate.findUnique as any;
      const mockPositionFindUnique = prisma.position.findUnique as any;
      const mockEvaluationFindFirst = prisma.evaluation.findFirst as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        resumeUrl: "https://example.com/resume.pdf",
      };

      const position = {
        id: "position-123",
        title: "Developer",
        description: null,
        experienceLevel: "mid",
        skills: ["JS"],
        softSkills: [],
      };

      mockCandidateFindUnique.mockResolvedValueOnce(candidate);
      mockPositionFindUnique.mockResolvedValueOnce(position);
      mockEvaluationFindFirst.mockResolvedValueOnce({ id: "existing-eval" });

      await expect(
        createCandidateEvaluation("candidate-123", "position-123")
      ).rejects.toThrow("Esiste già una valutazione");
    });

    it("handles PDF fetch failure", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCandidateFindUnique = prisma.candidate.findUnique as any;
      const mockPositionFindUnique = prisma.position.findUnique as any;
      const mockEvaluationFindFirst = prisma.evaluation.findFirst as any;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          statusText: "Not Found",
        })
      ) as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        resumeUrl: "https://example.com/404.pdf",
      };

      const position = {
        id: "position-123",
        title: "Developer",
        description: null,
        experienceLevel: "mid",
        skills: ["JS"],
        softSkills: [],
      };

      mockCandidateFindUnique.mockResolvedValueOnce(candidate);
      mockPositionFindUnique.mockResolvedValueOnce(position);
      mockEvaluationFindFirst.mockResolvedValueOnce(null);

      await expect(
        createCandidateEvaluation("candidate-123", "position-123")
      ).rejects.toThrow("Impossibile leggere il curriculum");
    });

    it("handles insufficient text extraction", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { extractText } = await import("unpdf");

      const mockCandidateFindUnique = prisma.candidate.findUnique as any;
      const mockPositionFindUnique = prisma.position.findUnique as any;
      const mockEvaluationFindFirst = prisma.evaluation.findFirst as any;
      const mockExtractText = extractText as any;

      mockExtractText.mockResolvedValueOnce({ text: "Too short" });

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        resumeUrl: "https://example.com/resume.pdf",
      };

      const position = {
        id: "position-123",
        title: "Developer",
        description: null,
        experienceLevel: "mid",
        skills: ["JS"],
        softSkills: [],
      };

      mockCandidateFindUnique.mockResolvedValueOnce(candidate);
      mockPositionFindUnique.mockResolvedValueOnce(position);
      mockEvaluationFindFirst.mockResolvedValueOnce(null);

      await expect(
        createCandidateEvaluation("candidate-123", "position-123")
      ).rejects.toThrow("Impossibile estrarre testo sufficiente");
    });

    it("uses fallback model on primary failure", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { generateText } = await import("ai");

      const mockCandidateFindUnique = prisma.candidate.findUnique as any;
      const mockPositionFindUnique = prisma.position.findUnique as any;
      const mockEvaluationFindFirst = prisma.evaluation.findFirst as any;
      const mockCreate = prisma.evaluation.create as any;
      const mockGenerateObject = generateText as any;

      const candidate = {
        id: "candidate-123",
        firstName: "Mario",
        lastName: "Rossi",
        resumeUrl: "https://example.com/resume.pdf",
      };

      const position = {
        id: "position-123",
        title: "Developer",
        description: null,
        experienceLevel: "mid",
        skills: ["JS"],
        softSkills: [],
      };

      mockCandidateFindUnique.mockResolvedValueOnce(candidate);
      mockPositionFindUnique.mockResolvedValueOnce(position);
      mockEvaluationFindFirst.mockResolvedValueOnce(null);

      // First call fails, second succeeds (fallback)
      mockGenerateObject
        .mockRejectedValueOnce(new Error("Primary model failed"))
        .mockResolvedValueOnce({
          output: {
            evaluation: "OK",
            strengths: [],
            weaknesses: [],
            recommendation: "OK",
            fitScore: 50,
          },
        });

      mockCreate.mockResolvedValueOnce({ id: "eval-123" });

      await createCandidateEvaluation("candidate-123", "position-123");

      expect(mockGenerateObject).toHaveBeenCalledTimes(2);
    });
  });

  describe("updateEvaluationNotes", () => {
    it("updates evaluation notes successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.evaluation.findUnique as any;
      const mockUpdate = prisma.evaluation.update as any;

      const evaluation = {
        id: "eval-123",
        interviewId: "interview-123",
        candidateId: null,
      };

      mockFindUnique.mockResolvedValueOnce(evaluation);
      mockUpdate.mockResolvedValueOnce({
        id: "eval-123",
        notes: "Updated notes",
      });

      const result = await updateEvaluationNotes("eval-123", "Updated notes");

      expect(result.notes).toBe("Updated notes");
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "eval-123" },
        data: { notes: "Updated notes" },
      });
    });

    it("throws error when evaluation not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.evaluation.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      await expect(
        updateEvaluationNotes("invalid-id", "Notes")
      ).rejects.toThrow("Valutazione non trovata");
    });

    it("invalidates cache after update", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidateEvaluationCache } = await import(
        "../../../lib/utils/cache-utils"
      );

      const mockFindUnique = prisma.evaluation.findUnique as any;
      const mockUpdate = prisma.evaluation.update as any;

      const evaluation = {
        id: "eval-123",
        interviewId: "interview-123",
        candidateId: "candidate-123",
      };

      mockFindUnique.mockResolvedValueOnce(evaluation);
      mockUpdate.mockResolvedValueOnce({ id: "eval-123" });

      await updateEvaluationNotes("eval-123", "Notes");

      expect(invalidateEvaluationCache).toHaveBeenCalledWith({
        evaluationId: "eval-123",
        interviewId: "interview-123",
        candidateId: "candidate-123",
      });
    });
  });

  describe("deleteEvaluation", () => {
    it("deletes evaluation successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.evaluation.findUnique as any;
      const mockDelete = prisma.evaluation.delete as any;

      const evaluation = {
        id: "eval-123",
        interviewId: "interview-123",
        candidateId: null,
      };

      mockFindUnique.mockResolvedValueOnce(evaluation);
      mockDelete.mockResolvedValueOnce({});

      const result = await deleteEvaluation("eval-123");

      expect(result.success).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "eval-123" } });
    });

    it("throws error when evaluation not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.evaluation.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      await expect(deleteEvaluation("invalid-id")).rejects.toThrow(
        "Valutazione non trovata"
      );
    });

    it("invalidates cache after deletion", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidateEvaluationCache } = await import(
        "../../../lib/utils/cache-utils"
      );

      const mockFindUnique = prisma.evaluation.findUnique as any;
      const mockDelete = prisma.evaluation.delete as any;

      const evaluation = {
        id: "eval-123",
        interviewId: null,
        candidateId: "candidate-123",
      };

      mockFindUnique.mockResolvedValueOnce(evaluation);
      mockDelete.mockResolvedValueOnce({});

      await deleteEvaluation("eval-123");

      expect(invalidateEvaluationCache).toHaveBeenCalledWith({
        evaluationId: "eval-123",
        interviewId: undefined,
        candidateId: "candidate-123",
      });
    });
  });
});
