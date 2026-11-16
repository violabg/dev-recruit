/**
 * Unit tests for lib/utils.ts
 *
 * Tests utility functions like getInitials, formatDate, etc.
 */

import {
  DEFAULT_GENERATION_MODEL,
  FALLBACK_MODELS,
  getAllAvailableModels,
  getModelsByCategory,
  getOptimalModel,
  LLM_MODELS,
} from "@/lib/services/ai/models";
import { formatDate, getInitials } from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("getInitials", () => {
  it("should return initials from full name", () => {
    expect(getInitials("Mario Rossi")).toBe("MR");
  });

  it("should handle single name", () => {
    expect(getInitials("Mario")).toBe("M");
  });

  it("should handle multiple names", () => {
    expect(getInitials("Mario Giuseppe Rossi")).toBe("MGR");
  });

  it("should return U for null", () => {
    expect(getInitials(null)).toBe("U");
  });

  it("should return U for undefined", () => {
    expect(getInitials(undefined)).toBe("U");
  });

  it("should uppercase the initials", () => {
    expect(getInitials("mario rossi")).toBe("MR");
  });
});

describe("formatDate", () => {
  it("should format date in Italian format", () => {
    const result = formatDate("2024-06-15");
    expect(result).toBe("15/06/2024");
  });

  it("should format date with time when showTime is true", () => {
    const result = formatDate("2024-06-15T14:30:00", true);
    expect(result).toMatch(/15\/06\/2024/);
    expect(result).toMatch(/14:30/);
  });

  it("should return N/A for null", () => {
    expect(formatDate(null)).toBe("N/A");
  });

  it("should handle ISO date strings", () => {
    const result = formatDate("2024-12-25T10:00:00.000Z");
    expect(result).toMatch(/25\/12\/2024/);
  });
});

describe("LLM_MODELS", () => {
  it("should only contain Groq free-plan models", () => {
    expect(LLM_MODELS.GPT_OSS_120B).toBe("openai/gpt-oss-120b");
    expect(LLM_MODELS.GPT_OSS_20B).toBe("openai/gpt-oss-20b");
    expect(LLM_MODELS.QWEN3_8_27B).toBe("qwen/qwen3.8-27b");
  });

  it("should have whisper models", () => {
    expect(LLM_MODELS.WHISPER_LARGE_V3).toBe("whisper-large-v3");
    expect(LLM_MODELS.WHISPER_LARGE_V3_TURBO).toBe("whisper-large-v3-turbo");
  });

  it("should not map two keys to the same model id", () => {
    const ids = Object.values(LLM_MODELS);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getOptimalModel", () => {
  it("should use GPT_OSS_120B for generation and evaluation tasks", () => {
    for (const task of [
      "quiz_generation",
      "question_generation",
      "evaluation",
      "overall_evaluation",
      "resume_evaluation",
    ] as const) {
      expect(getOptimalModel(task)).toBe(LLM_MODELS.GPT_OSS_120B);
    }
  });

  it("should use the faster GPT_OSS_20B for simple_task", () => {
    expect(getOptimalModel("simple_task")).toBe(LLM_MODELS.GPT_OSS_20B);
  });

  it("should use specific model when provided", () => {
    expect(getOptimalModel("quiz_generation", "custom-model")).toBe(
      "custom-model"
    );
  });
});

describe("FALLBACK_MODELS", () => {
  it("should fall back to other free models, never the primary", () => {
    expect(FALLBACK_MODELS).toEqual([
      LLM_MODELS.GPT_OSS_20B,
      LLM_MODELS.QWEN3_8_27B,
    ]);
    expect(FALLBACK_MODELS).not.toContain(DEFAULT_GENERATION_MODEL);
  });
});

describe("getAllAvailableModels", () => {
  it("should return array of all models", () => {
    const models = getAllAvailableModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models).toContain(LLM_MODELS.GPT_OSS_120B);
    expect(models).toContain(LLM_MODELS.GPT_OSS_20B);
  });
});

describe("getModelsByCategory", () => {
  it("should return models organized by category", () => {
    const categories = getModelsByCategory();

    expect(categories.production.text).toContain(LLM_MODELS.GPT_OSS_120B);
    expect(categories.production.audio).toContain(LLM_MODELS.WHISPER_LARGE_V3);
    expect(categories.preview.text).toContain(LLM_MODELS.QWEN3_8_27B);
  });
});
