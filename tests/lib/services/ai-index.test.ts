/**
 * Tests for AI Service Index (exports)
 */

import { describe, expect, it, vi } from "vitest";

// Mock the modules that the index re-exports
vi.mock("@/lib/services/ai/core", () => ({
  AIQuizService: class MockAIQuizService {},
  aiQuizService: {},
}));

vi.mock("@/lib/services/ai/prompts", () => ({
  buildPositionDescriptionPrompt: vi.fn(),
  buildQuestionPrompts: vi.fn(),
  buildQuizPrompt: vi.fn(),
  buildQuizSystemPrompt: vi.fn(),
  questionPromptBuilders: {},
}));

vi.mock("@/lib/services/ai/retry", () => ({
  withRetry: vi.fn(),
  withTimeout: vi.fn(),
}));

vi.mock("@/lib/services/ai/sanitize", () => ({
  sanitizeInput: vi.fn(),
}));

vi.mock("@/lib/services/ai/streaming", () => ({
  streamPositionDescription: vi.fn(),
}));

vi.mock("@/lib/services/ai/types", () => ({
  AIErrorCode: {
    GENERATION_FAILED: "GENERATION_FAILED",
    MODEL_UNAVAILABLE: "MODEL_UNAVAILABLE",
    TIMEOUT: "TIMEOUT",
    INVALID_RESPONSE: "INVALID_RESPONSE",
    RATE_LIMITED: "RATE_LIMITED",
    CONTENT_FILTERED: "CONTENT_FILTERED",
    QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  },
  AIGenerationError: class MockAIGenerationError extends Error {},
  DEFAULT_CONFIG: {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 60000,
    fallbackModels: [],
  },
}));

describe("AI Service Index Exports", () => {
  it("should export AIQuizService class", async () => {
    const aiModule = await import("@/lib/services/ai");
    expect(aiModule.AIQuizService).toBeDefined();
  });

  it("should export aiQuizService singleton", async () => {
    const aiModule = await import("@/lib/services/ai");
    expect(aiModule.aiQuizService).toBeDefined();
  });

  it("should export prompt builders", async () => {
    const aiModule = await import("@/lib/services/ai");

    expect(aiModule.buildPositionDescriptionPrompt).toBeDefined();
    expect(aiModule.buildQuestionPrompts).toBeDefined();
    expect(aiModule.buildQuizPrompt).toBeDefined();
    expect(aiModule.buildQuizSystemPrompt).toBeDefined();
    expect(aiModule.questionPromptBuilders).toBeDefined();
  });

  it("should export retry utilities", async () => {
    const aiModule = await import("@/lib/services/ai");

    expect(aiModule.withRetry).toBeDefined();
    expect(aiModule.withTimeout).toBeDefined();
  });

  it("should export sanitization utilities", async () => {
    const aiModule = await import("@/lib/services/ai");

    expect(aiModule.sanitizeInput).toBeDefined();
  });

  it("should export streaming utilities", async () => {
    const aiModule = await import("@/lib/services/ai");

    expect(aiModule.streamPositionDescription).toBeDefined();
  });

  it("should export error types", async () => {
    const aiModule = await import("@/lib/services/ai");

    expect(aiModule.AIErrorCode).toBeDefined();
    expect(aiModule.AIGenerationError).toBeDefined();
  });

  it("should export default config", async () => {
    const aiModule = await import("@/lib/services/ai");

    expect(aiModule.DEFAULT_CONFIG).toBeDefined();
    expect(aiModule.DEFAULT_CONFIG.maxRetries).toBeDefined();
    expect(aiModule.DEFAULT_CONFIG.timeout).toBeDefined();
  });

  it("should export AIErrorCode enum values", async () => {
    const aiModule = await import("@/lib/services/ai");

    expect(aiModule.AIErrorCode.GENERATION_FAILED).toBe("GENERATION_FAILED");
    expect(aiModule.AIErrorCode.MODEL_UNAVAILABLE).toBe("MODEL_UNAVAILABLE");
    expect(aiModule.AIErrorCode.TIMEOUT).toBe("TIMEOUT");
    expect(aiModule.AIErrorCode.INVALID_RESPONSE).toBe("INVALID_RESPONSE");
    expect(aiModule.AIErrorCode.RATE_LIMITED).toBe("RATE_LIMITED");
    expect(aiModule.AIErrorCode.CONTENT_FILTERED).toBe("CONTENT_FILTERED");
    expect(aiModule.AIErrorCode.QUOTA_EXCEEDED).toBe("QUOTA_EXCEEDED");
  });
});
