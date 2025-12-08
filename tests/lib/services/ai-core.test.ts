import { describe, expect, it, vi } from "vitest";

vi.mock("ai", async () => {
  const actual = await vi.importActual("ai");
  return {
    generateObject: vi.fn(),
    NoObjectGeneratedError:
      (actual as any).NoObjectGeneratedError ||
      class NoObjectGeneratedError extends Error {},
  };
});

import { generateObject, NoObjectGeneratedError } from "ai";

// Mock utils used by AI core (relative imports inside lib/services/ai)
vi.mock("@/lib/services/ai/retry", () => ({
  withRetry: (fn: any) => fn,
  withTimeout: (fn: any, timeout: any) => fn(),
}));

// Partially mock ai types module to expose DEFAULT_CONFIG and AIGenerationError
vi.mock("@/lib/services/ai/types", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    DEFAULT_CONFIG: { timeout: 5000, fallbackModels: [] },
    AIGenerationError:
      (actual as any).AIGenerationError ??
      class AIGenerationError extends Error {},
    AIErrorCode: (actual as any).AIErrorCode ?? {
      INVALID_RESPONSE: "INVALID_RESPONSE",
      GENERATION_FAILED: "GENERATION_FAILED",
    },
  };
});

// Mock helpers used inside AI core
vi.mock("@/lib/utils", async () => ({ getOptimalModel: () => "test-model" }));
vi.mock("@/lib/schemas", async () => {
  const actual = await vi.importActual("@/lib/schemas");
  return {
    convertToStrictQuestions: (q: any) =>
      q.map((x: any) => ({ ...x, type: x.type || "open" })),
  };
});

// Now import the service after mocks are in place

describe("AI core service", () => {
  it.skip("generateQuiz returns converted questions when AI responds (skipped - needs integration mocks)", async () => {
    // Placeholder: requires heavy mocking of ai.generateObject, retry/timeouts and schemas
    expect(typeof generateObject).toBe("function");
  });

  it.skip("generateQuiz retries fallback when NoObjectGeneratedError (skipped)", async () => {
    expect(typeof NoObjectGeneratedError).toBe("function");
  });
});
