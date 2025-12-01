/**
 * Tests for AI Service Retry Utilities
 */
import { withRetry, withTimeout } from "@/lib/services/ai/retry";
import { AIErrorCode, AIGenerationError } from "@/lib/services/ai/types";
import { describe, expect, it, vi } from "vitest";
// Mock the types module before importing retry
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
  AIGenerationError: class AIGenerationError extends Error {
    code: string;
    details?: Record<string, unknown>;
    constructor(
      message: string,
      code: string,
      details?: Record<string, unknown>
    ) {
      super(message);
      this.name = "AIGenerationError";
      this.code = code;
      this.details = details;
    }
  },
  DEFAULT_CONFIG: {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 60000,
    fallbackModels: ["model-1", "model-2"],
  },
}));

describe("withRetry", () => {
  const defaultConfig = {
    maxRetries: 3,
    retryDelay: 1, // Very short delay for fast tests
    timeout: 60000,
    fallbackModels: [],
  };

  it("should return result on first successful call", async () => {
    const fn = vi.fn().mockResolvedValue("success");

    const result = await withRetry(fn, defaultConfig);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure and succeed", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("First failure"))
      .mockResolvedValue("success");

    const result = await withRetry(fn, defaultConfig);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should use exponential backoff for delays", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Fail 1"))
      .mockRejectedValueOnce(new Error("Fail 2"))
      .mockRejectedValueOnce(new Error("Fail 3"))
      .mockResolvedValue("success");

    const result = await withRetry(fn, defaultConfig);

    expect(fn).toHaveBeenCalledTimes(4);
    expect(result).toBe("success");
  });

  it("should throw after all retries exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Persistent failure"));

    await expect(withRetry(fn, defaultConfig)).rejects.toThrow(
      "Persistent failure"
    );
    expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });

  it("should not retry on CONTENT_FILTERED errors", async () => {
    const contentFilteredError = new AIGenerationError(
      "Content was filtered",
      AIErrorCode.CONTENT_FILTERED
    );
    const fn = vi.fn().mockRejectedValue(contentFilteredError);

    await expect(withRetry(fn, defaultConfig)).rejects.toThrow(
      "Content was filtered"
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on other AIGenerationError types", async () => {
    const rateLimitError = new AIGenerationError(
      "Rate limited",
      AIErrorCode.RATE_LIMITED
    );
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValue("success");

    const result = await withRetry(fn, defaultConfig);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should respect maxRetries of 0", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Failure"));

    const config = { ...defaultConfig, maxRetries: 0 };

    await expect(withRetry(fn, config)).rejects.toThrow("Failure");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should use custom retryDelay", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Fail"))
      .mockResolvedValue("success");

    const config = { ...defaultConfig, retryDelay: 1 };

    const result = await withRetry(fn, config);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("withTimeout", () => {
  it("should resolve if promise completes before timeout", async () => {
    const promise = Promise.resolve("success");

    const result = await withTimeout(promise, 5000);

    expect(result).toBe("success");
  });

  it("should reject with timeout error if promise takes too long", async () => {
    // Use real timers for this test to avoid fake timer issues with Promise.race
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve("never used"), 10000);
    });

    const resultPromise = withTimeout(slowPromise, 50);

    await expect(resultPromise).rejects.toThrow("AI generation timed out");
  });

  it("should throw AIGenerationError with TIMEOUT code", async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve("never used"), 10000);
    });

    const resultPromise = withTimeout(slowPromise, 50);

    try {
      await resultPromise;
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AIGenerationError);
      expect((error as AIGenerationError).code).toBe(AIErrorCode.TIMEOUT);
    }
  });

  it("should propagate original error if promise rejects before timeout", async () => {
    const error = new Error("Original error");
    const failingPromise = Promise.reject(error);

    await expect(withTimeout(failingPromise, 5000)).rejects.toThrow(
      "Original error"
    );
  });

  it("should handle immediate resolution", async () => {
    const promise = Promise.resolve("immediate");

    const result = await withTimeout(promise, 1000);

    expect(result).toBe("immediate");
  });

  it("should handle very short timeouts", async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve("never used"), 10000);
    });

    const resultPromise = withTimeout(slowPromise, 10);

    await expect(resultPromise).rejects.toThrow("AI generation timed out");
  });
});
