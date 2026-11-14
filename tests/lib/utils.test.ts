/**
 * Unit tests for lib/utils.ts
 *
 * Tests utility functions like cn, getInitials, prismLanguage, formatDate, etc.
 */

import {
  DEFAULT_GENERATION_MODEL,
  FALLBACK_MODELS,
  getAllAvailableModels,
  getModelsByCategory,
  getOptimalModel,
  LLM_MODELS,
} from "@/lib/services/ai/models";
import {
  cn,
  formatDate,
  getInitials,
  getStatusColor,
  prismLanguage,
} from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("cn (className utility)", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("should merge tailwind classes correctly", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("should handle arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("should handle objects", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("should handle undefined and null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });
});

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

describe("prismLanguage", () => {
  it("should map javascript", () => {
    expect(prismLanguage("javascript")).toBe("javascript");
    expect(prismLanguage("JavaScript")).toBe("javascript");
    expect(prismLanguage("js")).toBe("javascript");
    expect(prismLanguage("JS")).toBe("javascript");
  });

  it("should map typescript", () => {
    expect(prismLanguage("typescript")).toBe("typescript");
    expect(prismLanguage("TypeScript")).toBe("typescript");
    expect(prismLanguage("ts")).toBe("typescript");
    expect(prismLanguage("TS")).toBe("typescript");
  });

  it("should map python", () => {
    expect(prismLanguage("python")).toBe("python");
    expect(prismLanguage("Python")).toBe("python");
    expect(prismLanguage("py")).toBe("python");
  });

  it("should map java to typescript", () => {
    // Note: This is the current behavior in the codebase
    expect(prismLanguage("java")).toBe("typescript");
  });

  it("should map c# to csharp", () => {
    expect(prismLanguage("c#")).toBe("csharp");
    expect(prismLanguage("C#")).toBe("csharp");
    expect(prismLanguage("csharp")).toBe("csharp");
  });

  it("should map cpp", () => {
    expect(prismLanguage("cpp")).toBe("cpp");
    expect(prismLanguage("c++")).toBe("cpp");
    expect(prismLanguage("C++")).toBe("cpp");
  });

  it("should map other languages", () => {
    expect(prismLanguage("go")).toBe("go");
    expect(prismLanguage("ruby")).toBe("ruby");
    expect(prismLanguage("php")).toBe("php");
    expect(prismLanguage("swift")).toBe("swift");
    expect(prismLanguage("kotlin")).toBe("kotlin");
  });

  it("should map html and css to markup", () => {
    expect(prismLanguage("html")).toBe("markup");
    expect(prismLanguage("css")).toBe("markup");
  });

  it("should default to javascript for unknown languages", () => {
    expect(prismLanguage("unknown")).toBe("javascript");
    expect(prismLanguage("")).toBe("javascript");
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

describe("getStatusColor", () => {
  it("should return yellow for pending", () => {
    expect(getStatusColor("pending")).toBe("bg-yellow-500 text-black");
  });

  it("should return blue for contacted", () => {
    expect(getStatusColor("contacted")).toBe("bg-blue-600");
  });

  it("should return purple for interviewing", () => {
    expect(getStatusColor("interviewing")).toBe("bg-purple-500");
  });

  it("should return green for hired", () => {
    expect(getStatusColor("hired")).toBe("bg-green-500 text-black");
  });

  it("should return red for rejected", () => {
    expect(getStatusColor("rejected")).toBe("bg-red-500");
  });

  it("should return gray for unknown status", () => {
    expect(getStatusColor("unknown")).toBe("bg-gray-500");
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
