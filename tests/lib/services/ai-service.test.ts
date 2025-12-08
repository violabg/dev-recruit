import {
  AIErrorCode,
  AIGenerationError,
  AIQuizService,
  DEFAULT_CONFIG,
  aiQuizService,
  sanitizeInput,
  streamPositionDescription,
  withRetry,
  withTimeout,
} from "@/lib/services/ai-service";
import { describe, expect, it } from "vitest";

describe("ai-service re-exports", () => {
  it("re-exports AIErrorCode", () => {
    expect(AIErrorCode).toBeDefined();
  });

  it("re-exports AIGenerationError", () => {
    expect(AIGenerationError).toBeDefined();
  });

  it("re-exports AIQuizService", () => {
    expect(AIQuizService).toBeDefined();
  });

  it("re-exports DEFAULT_CONFIG", () => {
    expect(DEFAULT_CONFIG).toBeDefined();
  });

  it("re-exports aiQuizService", () => {
    expect(aiQuizService).toBeDefined();
  });

  it("re-exports sanitizeInput", () => {
    expect(typeof sanitizeInput).toBe("function");
  });

  it("re-exports streamPositionDescription", () => {
    expect(typeof streamPositionDescription).toBe("function");
  });

  it("re-exports withRetry", () => {
    expect(typeof withRetry).toBe("function");
  });

  it("re-exports withTimeout", () => {
    expect(typeof withTimeout).toBe("function");
  });
});
