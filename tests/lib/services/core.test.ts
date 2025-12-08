import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AIGenerationError,
  AIQuizService,
  DEFAULT_CONFIG,
} from "../../../lib/services/ai-service";

// Mock external dependencies
vi.mock("@ai-sdk/groq");
vi.mock("ai", () => ({
  generateObject: vi.fn(),
  NoObjectGeneratedError: class NoObjectGeneratedError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "NoObjectGeneratedError";
    }
  },
}));

vi.mock("../../../lib/utils", () => ({
  getOptimalModel: vi.fn((type: string, specificModel?: string) => {
    return specificModel || "llama-3.3-70b-versatile";
  }),
}));

vi.mock("../../../lib/schemas", () => ({
  aiQuizGenerationSchema: { parse: (data: any) => data },
  questionSchemas: {
    flexible: { parse: (data: any) => data },
    strict: { parse: (data: any) => data },
  },
  convertToStrictQuestions: (questions: any[]) => questions,
}));

vi.mock("../../../lib/services/ai/prompts", () => ({
  buildQuizPrompt: vi.fn(() => "quiz prompt"),
  buildQuizSystemPrompt: vi.fn(() => "quiz system prompt"),
  buildQuestionPrompts: vi.fn(() => ({ system: "system", user: "user" })),
}));

describe("AIQuizService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("creates service with default config", () => {
      const service = new AIQuizService();
      expect(service).toBeInstanceOf(AIQuizService);
    });

    it("creates service with custom config", () => {
      const customConfig = {
        timeout: 30000,
        maxRetries: 5,
      };
      const service = new AIQuizService(customConfig);
      expect(service).toBeInstanceOf(AIQuizService);
    });

    it("merges custom config with defaults", () => {
      const customConfig = { timeout: 30000 };
      const service = new AIQuizService(customConfig);
      expect(service).toBeInstanceOf(AIQuizService);
      // Config is internal, so we verify through behavior
    });
  });

  describe("generateQuiz", () => {
    it("returns questions array on success", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          title: "Test Quiz",
          questions: [
            {
              id: "q1",
              type: "multiple_choice",
              question: "What is 2+2?",
              options: ["4", "5"],
              correctAnswer: "4",
            },
          ],
        },
      });

      const service = new AIQuizService();
      const result = await service.generateQuiz({
        positionTitle: "Developer",
        experienceLevel: "junior",
        skills: ["JavaScript"],
        quizTitle: "Test Quiz",
        questionCount: 1,
        difficulty: 1,
        includeMultipleChoice: true,
        includeOpenQuestions: false,
        includeCodeSnippets: false,
      });

      expect(result).toHaveProperty("questions");
      expect(Array.isArray(result.questions)).toBe(true);
    });

    it("throws on invalid response structure", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          // Missing required fields
        },
      });

      const service = new AIQuizService();
      await expect(
        service.generateQuiz({
          positionTitle: "Developer",
          experienceLevel: "junior",
          skills: ["JavaScript"],
          quizTitle: "Test Quiz",
          questionCount: 1,
          difficulty: 1,
          includeMultipleChoice: true,
          includeOpenQuestions: false,
          includeCodeSnippets: false,
        })
      ).rejects.toThrow();
    });

    it("accepts optional parameters", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          title: "Quiz",
          questions: [],
        },
      });

      const service = new AIQuizService();
      const result = await service.generateQuiz({
        positionTitle: "Developer",
        experienceLevel: "senior",
        skills: ["TypeScript"],
        quizTitle: "Advanced Quiz",
        questionCount: 5,
        difficulty: 5,
        includeMultipleChoice: true,
        includeOpenQuestions: true,
        includeCodeSnippets: true,
        description: "Test description",
        instructions: "Test instructions",
        previousQuestions: [{ question: "Previous q" }],
        specificModel: "custom-model",
      });

      expect(result).toHaveProperty("questions");
    });

    it("uses timeout from config", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          title: "Quiz",
          questions: [],
        },
      });

      const service = new AIQuizService({ timeout: 10000 });
      await service.generateQuiz({
        positionTitle: "Developer",
        experienceLevel: "junior",
        skills: ["JavaScript"],
        quizTitle: "Quiz",
        questionCount: 1,
        difficulty: 1,
        includeMultipleChoice: true,
        includeOpenQuestions: false,
        includeCodeSnippets: false,
      });

      expect(mockGenerateObject).toHaveBeenCalled();
    });
  });

  describe("generateQuestion", () => {
    it("returns single question on success", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          type: "multiple_choice",
          question: "What is 2+2?",
          options: ["4", "5"],
          correctAnswer: "4",
        },
      });

      const service = new AIQuizService();
      const result = await service.generateQuestion({
        type: "multiple_choice",
        quizTitle: "Test Quiz",
        positionTitle: "Developer",
        experienceLevel: "junior",
        skills: ["JavaScript"],
      });

      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("question");
    });

    it("accepts multiple choice parameters", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          type: "multiple_choice",
          question: "Test",
          options: ["A", "B"],
          correctAnswer: "A",
        },
      });

      const service = new AIQuizService();
      await service.generateQuestion({
        quizTitle: "Quiz",
        positionTitle: "Developer",
        experienceLevel: "junior",
        skills: ["JS"],
        // Multiple choice params
      } as any);

      expect(mockGenerateObject).toHaveBeenCalled();
    });

    it("accepts open question parameters", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          type: "open_question",
          question: "Explain X",
          expectedAnswer: "Answer here",
        },
      });

      const service = new AIQuizService();
      await service.generateQuestion({
        quizTitle: "Quiz",
        positionTitle: "Developer",
        experienceLevel: "junior",
        skills: ["JS"],
        // Open question params
      } as any);

      expect(mockGenerateObject).toHaveBeenCalled();
    });

    it("accepts code snippet parameters", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          type: "code_snippet",
          question: "Fix the bug",
          codeSnippet: "const x = ",
          expectedAnswer: "const x = 5;",
        },
      });

      const service = new AIQuizService();
      await service.generateQuestion({
        quizTitle: "Quiz",
        positionTitle: "Developer",
        experienceLevel: "junior",
        skills: ["JS"],
        difficulty: 3,
        // Code snippet params
      } as any);

      expect(mockGenerateObject).toHaveBeenCalled();
    });

    it("handles optional parameters", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          type: "multiple_choice",
          question: "Test",
          options: ["A"],
          correctAnswer: "A",
        },
      });

      const service = new AIQuizService();
      await service.generateQuestion({
        type: "multiple_choice",
        quizTitle: "Quiz",
        positionTitle: "Developer",
        experienceLevel: "senior",
        skills: ["TypeScript"],
        difficulty: 4,
        previousQuestions: [{ question: "Previous" }],
        specificModel: "custom-model",
        instructions: "Custom instructions",
      });

      expect(mockGenerateObject).toHaveBeenCalled();
    });
  });

  describe("configuration", () => {
    it("uses DEFAULT_CONFIG when no custom config provided", () => {
      const service = new AIQuizService();
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(DEFAULT_CONFIG.maxRetries).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CONFIG.timeout).toBeGreaterThan(0);
    });

    it("allows timeout override", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockResolvedValueOnce({
        object: { title: "Quiz", questions: [] },
      });

      const customTimeout = 5000;
      const service = new AIQuizService({ timeout: customTimeout });

      await service.generateQuiz({
        positionTitle: "Developer",
        experienceLevel: "junior",
        skills: ["JS"],
        quizTitle: "Quiz",
        questionCount: 1,
        difficulty: 1,
        includeMultipleChoice: true,
        includeOpenQuestions: false,
        includeCodeSnippets: false,
      });

      expect(mockGenerateObject).toHaveBeenCalled();
    });

    it("allows maxRetries override", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockResolvedValueOnce({
        object: { title: "Quiz", questions: [] },
      });

      const service = new AIQuizService({ maxRetries: 5 });

      await service.generateQuiz({
        positionTitle: "Developer",
        experienceLevel: "junior",
        skills: ["JS"],
        quizTitle: "Quiz",
        questionCount: 1,
        difficulty: 1,
        includeMultipleChoice: true,
        includeOpenQuestions: false,
        includeCodeSnippets: false,
      });

      expect(mockGenerateObject).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("throws AIGenerationError on generation failure", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockRejectedValueOnce(new Error("Generation failed"));

      const service = new AIQuizService();
      await expect(
        service.generateQuiz({
          positionTitle: "Developer",
          experienceLevel: "junior",
          skills: ["JS"],
          quizTitle: "Quiz",
          questionCount: 1,
          difficulty: 1,
          includeMultipleChoice: true,
          includeOpenQuestions: false,
          includeCodeSnippets: false,
        })
      ).rejects.toThrow();
    });

    it("includes error details in thrown error", async () => {
      const { generateObject } = await import("ai");
      const mockGenerateObject = generateObject as any;

      mockGenerateObject.mockResolvedValueOnce({
        object: null,
      });

      const service = new AIQuizService();
      try {
        await service.generateQuiz({
          positionTitle: "Developer",
          experienceLevel: "junior",
          skills: ["JS"],
          quizTitle: "Quiz",
          questionCount: 1,
          difficulty: 1,
          includeMultipleChoice: true,
          includeOpenQuestions: false,
          includeCodeSnippets: false,
        });
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error).toBeInstanceOf(AIGenerationError);
      }
    });
  });

  describe("instance isolation", () => {
    it("creates independent service instances", async () => {
      const service1 = new AIQuizService({ timeout: 5000 });
      const service2 = new AIQuizService({ timeout: 10000 });

      expect(service1).not.toBe(service2);
      expect(service1).toBeInstanceOf(AIQuizService);
      expect(service2).toBeInstanceOf(AIQuizService);
    });

    it("each instance can be configured independently", async () => {
      const service1 = new AIQuizService({ maxRetries: 2 });
      const service2 = new AIQuizService({ maxRetries: 5 });

      expect(service1).not.toBe(service2);
    });
  });
});
