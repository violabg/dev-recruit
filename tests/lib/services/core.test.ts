import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Module specifiers for mocking
const schemasPath = "../../../lib/schemas";
const utilsPath = "../../../lib/utils";
const promptsPath = "../../../lib/services/ai/prompts";

// Mock external 'ai' module used by core.ts
vi.mock("ai", async () => {
  return {
    generateObject: vi.fn(async (opts: any) => {
      // If the system prompt is the quiz system, return a quiz
      if (opts.system === "quiz-system") {
        return {
          object: { title: "Test Quiz", questions: [{ id: "q1", text: "Q1" }] },
        };
      }

      // Otherwise return a single question object for question generation
      return { object: { question: { id: "q2", text: "Q2" } } };
    }),
    NoObjectGeneratedError: class NoObjectGeneratedError extends Error {},
  };
});

vi.mock("@ai-sdk/groq", () => ({ groq: (m: any) => m }));

// Mock internal schema helpers to avoid heavy validation
vi.mock("../../../lib/schemas", () => ({
  aiQuizGenerationSchema: {},
  convertToStrictQuestions: (items: any[]) =>
    items.map((it: any) => it.question ?? it),
  questionSchemas: { flexible: {} },
}));

// Mock utils.getOptimalModel
vi.mock("../../../lib/utils", () => ({
  getOptimalModel: (type: string, specific?: string) =>
    specific ?? "test-model",
}));

// Mock prompts builders
vi.mock("../../../lib/services/ai/prompts", () => ({
  buildQuestionPrompts: (params: any) => ({
    systemPrompt: "sys",
    userPrompt: "usr",
  }),
  buildQuizPrompt: (params: any) => "quiz-prompt",
  buildQuizSystemPrompt: () => "quiz-system",
}));

// Import the module under test after mocks are in place
import { AIQuizService, aiQuizService } from "../../../lib/services/ai/core";

describe("AIQuizService", () => {
  it("exports singleton and class", () => {
    expect(aiQuizService).toBeDefined();
    expect(AIQuizService).toBeDefined();
  });

  it("generateQuiz returns converted questions", async () => {
    const svc = new AIQuizService();
    const res = await svc.generateQuiz({
      prompt: "x",
      specificModel: "m",
    } as any);
    expect(res).toBeDefined();
    expect(res.questions).toBeDefined();
    expect(Array.isArray(res.questions)).toBe(true);
    expect((res.questions[0] as any).id).toBe("q1");
  });

  it("generateQuestion returns a single strict question", async () => {
    const svc = new AIQuizService();
    const q = await svc.generateQuestion({
      prompt: "y",
      specificModel: "m",
    } as any);
    expect(q).toBeDefined();
    expect((q as any).id).toBeDefined();
  });
});
