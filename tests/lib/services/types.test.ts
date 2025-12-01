/**
 * Tests for AI Service Types
 */

import {
  AIErrorCode,
  AIGenerationError,
  DEFAULT_CONFIG,
} from "@/lib/services/ai/types";
import { describe, expect, it } from "vitest";

describe("AIErrorCode", () => {
  it("should have all expected error codes", () => {
    expect(AIErrorCode.GENERATION_FAILED).toBe("GENERATION_FAILED");
    expect(AIErrorCode.MODEL_UNAVAILABLE).toBe("MODEL_UNAVAILABLE");
    expect(AIErrorCode.TIMEOUT).toBe("TIMEOUT");
    expect(AIErrorCode.INVALID_RESPONSE).toBe("INVALID_RESPONSE");
    expect(AIErrorCode.RATE_LIMITED).toBe("RATE_LIMITED");
    expect(AIErrorCode.CONTENT_FILTERED).toBe("CONTENT_FILTERED");
    expect(AIErrorCode.QUOTA_EXCEEDED).toBe("QUOTA_EXCEEDED");
  });
});

describe("AIGenerationError", () => {
  it("should create error with message and code", () => {
    const error = new AIGenerationError(
      "Test error",
      AIErrorCode.GENERATION_FAILED
    );

    expect(error.message).toBe("Test error");
    expect(error.code).toBe(AIErrorCode.GENERATION_FAILED);
    expect(error.name).toBe("AIGenerationError");
    expect(error.details).toBeUndefined();
  });

  it("should create error with details", () => {
    const details = { model: "test-model", attempt: 3 };
    const error = new AIGenerationError(
      "Test error",
      AIErrorCode.MODEL_UNAVAILABLE,
      details
    );

    expect(error.details).toEqual(details);
  });

  it("should be instanceof Error", () => {
    const error = new AIGenerationError("Test", AIErrorCode.TIMEOUT);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AIGenerationError);
  });

  it("should have stack trace", () => {
    const error = new AIGenerationError("Test", AIErrorCode.TIMEOUT);

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("AIGenerationError");
  });
});

describe("DEFAULT_CONFIG", () => {
  it("should have expected default values", () => {
    expect(DEFAULT_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_CONFIG.retryDelay).toBe(1000);
    expect(DEFAULT_CONFIG.timeout).toBe(60000);
  });

  it("should have fallback models defined", () => {
    expect(Array.isArray(DEFAULT_CONFIG.fallbackModels)).toBe(true);
    expect(DEFAULT_CONFIG.fallbackModels.length).toBeGreaterThan(0);
  });

  it("should have valid fallback model names", () => {
    DEFAULT_CONFIG.fallbackModels.forEach((model) => {
      expect(typeof model).toBe("string");
      expect(model.length).toBeGreaterThan(0);
    });
  });
});
