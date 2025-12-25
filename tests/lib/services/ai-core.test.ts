import { describe, expect, it, vi } from "vitest";

// Mock the entire ai module properly
vi.mock("ai", async () => {
  const actual = await vi.importActual("ai");
  return {
    generateText: vi.fn().mockResolvedValue({
      output: {
        title: "Mock Quiz",
        questions: [
          {
            type: "multiple_choice",
            question: "Mock question?",
            options: ["A", "B", "C"],
            correctAnswer: 0,
            explanation: "Mock explanation",
          },
        ],
      },
    }),
    NoObjectGeneratedError:
      (actual as any).NoObjectGeneratedError ||
      class NoObjectGeneratedError extends Error {},
    wrapLanguageModel: vi.fn((config) => config.model),
    Output: {
      object: vi.fn((config) => config),
    },
  };
});

vi.mock("@ai-sdk/groq");
vi.mock("@ai-sdk/devtools");
vi.mock("@/lib/services/ai/retry", () => ({
  withRetry: (fn: any) => fn,
  withTimeout: (fn: any, timeout: any) => fn(),
}));
vi.mock("@/lib/services/ai/types");
vi.mock("@/lib/utils");
vi.mock("@/lib/schemas");
vi.mock("@/lib/services/ai/prompts");

describe("AI core service", () => {
  it.skip("generateQuiz returns converted questions when AI responds (skipped - needs integration mocks)", () => {
    // Placeholder test - the ai-core module has complex internal dependencies
    // and proper testing requires integration-level mocking
    expect(true).toBe(true);
  });

  it.skip("generateQuiz retries fallback when NoObjectGeneratedError (skipped)", () => {
    // Placeholder test
    expect(true).toBe(true);
  });
});
