/**
 * Unit tests for lib/utils/action-error-handler.ts
 *
 * Tests error handling utilities for server actions
 */

import { AIErrorCode } from "@/lib/services/ai-service";
import { QuizErrorCode } from "@/lib/services/error-handler";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the modules before importing the functions that use them
vi.mock("@/lib/services/error-handler", () => {
  class MockQuizSystemError extends Error {
    constructor(
      message: string,
      public code: string,
      public context?: Record<string, unknown>
    ) {
      super(message);
      this.name = "QuizSystemError";
    }
  }

  return {
    QuizSystemError: MockQuizSystemError,
    QuizErrorCode: {
      AI_GENERATION_FAILED: "AI_GENERATION_FAILED",
      INVALID_INPUT: "INVALID_INPUT",
    },
    errorHandler: {
      handleError: vi.fn(() => Promise.resolve()),
    },
    getUserFriendlyErrorMessage: vi.fn(
      (error: { message: string }) => `User-friendly: ${error.message}`
    ),
  };
});

vi.mock("@/lib/services/ai-service", () => {
  class MockAIGenerationError extends Error {
    constructor(
      message: string,
      public code: string,
      public details?: Record<string, unknown>
    ) {
      super(message);
      this.name = "AIGenerationError";
    }
  }

  return {
    AIGenerationError: MockAIGenerationError,
    AIErrorCode: {
      GENERATION_FAILED: "GENERATION_FAILED",
      MODEL_UNAVAILABLE: "MODEL_UNAVAILABLE",
    },
  };
});

// Import after mocks are set up
import { AIGenerationError } from "@/lib/services/ai-service";
import { QuizSystemError, errorHandler } from "@/lib/services/error-handler";
import {
  handleActionError,
  isRedirectError,
  type ActionErrorOptions,
} from "@/lib/utils/action-error-handler";

describe("handleActionError", () => {
  const defaultOptions: ActionErrorOptions = {
    operation: "testOperation",
    fallbackMessage: "Test fallback message",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw generic error for unknown errors", () => {
    const error = new Error("Unknown error");

    expect(() => handleActionError(error, defaultOptions)).toThrow(
      "Test fallback message"
    );
  });

  it("should convert QuizSystemError to user-friendly message", () => {
    const error = new QuizSystemError(
      "AI failed",
      QuizErrorCode.AI_GENERATION_FAILED
    );

    expect(() => handleActionError(error, defaultOptions)).toThrow(
      "User-friendly: AI failed"
    );
  });

  it("should re-throw QuizSystemError when rethrowKnownErrors is true", () => {
    const error = new QuizSystemError(
      "AI failed",
      QuizErrorCode.AI_GENERATION_FAILED
    );

    expect(() =>
      handleActionError(error, {
        ...defaultOptions,
        rethrowKnownErrors: true,
      })
    ).toThrow(error);
  });

  it("should re-throw AIGenerationError when rethrowKnownErrors is true", () => {
    const error = new AIGenerationError(
      "Model failed",
      AIErrorCode.GENERATION_FAILED
    );

    expect(() =>
      handleActionError(error, {
        ...defaultOptions,
        rethrowKnownErrors: true,
      })
    ).toThrow(error);
  });

  it("should use default fallback message when not provided", () => {
    const error = new Error("Unknown");

    expect(() =>
      handleActionError(error, {
        operation: "test",
      })
    ).toThrow("Operation failed. Please try again.");
  });

  it("should log error with context", () => {
    const error = new Error("Test error");
    const context = { quizId: "123" };

    expect(() =>
      handleActionError(error, {
        operation: "testOp",
        context,
        fallbackMessage: "Failed",
      })
    ).toThrow("Failed");

    expect(errorHandler.handleError).toHaveBeenCalledWith(error, {
      operation: "testOp",
      quizId: "123",
    });
  });
});

describe("isRedirectError", () => {
  it("should return true for objects with digest property", () => {
    expect(isRedirectError({ digest: "NEXT_REDIRECT" })).toBe(true);
    expect(isRedirectError({ digest: "some-other-digest" })).toBe(true);
  });

  it("should return false for regular errors", () => {
    expect(isRedirectError(new Error("test"))).toBe(false);
    expect(isRedirectError({ message: "test" })).toBe(false);
  });

  it("should return false for null/undefined", () => {
    expect(isRedirectError(null)).toBe(false);
    expect(isRedirectError(undefined)).toBe(false);
  });

  it("should return false for primitives", () => {
    expect(isRedirectError("string")).toBe(false);
    expect(isRedirectError(123)).toBe(false);
    expect(isRedirectError(true)).toBe(false);
  });
});

describe("isRedirectError", () => {
  it("should return true for objects with digest property", () => {
    expect(isRedirectError({ digest: "NEXT_REDIRECT" })).toBe(true);
    expect(isRedirectError({ digest: "some-other-digest" })).toBe(true);
  });

  it("should return false for regular errors", () => {
    expect(isRedirectError(new Error("test"))).toBe(false);
    expect(isRedirectError({ message: "test" })).toBe(false);
  });

  it("should return false for null/undefined", () => {
    expect(isRedirectError(null)).toBe(false);
    expect(isRedirectError(undefined)).toBe(false);
  });

  it("should return false for primitives", () => {
    expect(isRedirectError("string")).toBe(false);
    expect(isRedirectError(123)).toBe(false);
    expect(isRedirectError(true)).toBe(false);
  });
});
