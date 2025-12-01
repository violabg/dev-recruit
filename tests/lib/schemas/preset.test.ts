/**
 * Tests for Preset Schema
 */

import {
  createPresetSchema,
  presetSchema,
  updatePresetSchema,
} from "@/lib/schemas/preset";
import { describe, expect, it } from "vitest";

describe("presetSchema", () => {
  const validPreset = {
    id: "clxyz123456789012345678901",
    name: "javascript-basics",
    label: "JavaScript Basics",
    description: "Basic JavaScript questions",
    icon: "Code",
    questionType: "multiple_choice" as const,
    tags: ["javascript", "basics"],
    difficulty: 3,
  };

  describe("valid inputs", () => {
    it("should accept valid preset with required fields", () => {
      const result = presetSchema.safeParse(validPreset);
      expect(result.success).toBe(true);
    });

    it("should accept preset with all optional fields", () => {
      const fullPreset = {
        ...validPreset,
        instructions: "Focus on ES6+ features",
        focusAreas: ["arrays", "functions"],
        distractorComplexity: "moderate" as const,
        expectedResponseLength: "medium" as const,
        evaluationCriteria: ["accuracy", "completeness"],
        language: "javascript",
        bugType: "logic" as const,
        codeComplexity: "intermediate" as const,
        includeComments: true,
        isDefault: false,
      };

      const result = presetSchema.safeParse(fullPreset);
      expect(result.success).toBe(true);
    });

    it("should accept all question types", () => {
      const types = ["multiple_choice", "open_question", "code_snippet"];

      types.forEach((type) => {
        const result = presetSchema.safeParse({
          ...validPreset,
          questionType: type,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should accept all difficulty levels", () => {
      for (let difficulty = 1; difficulty <= 5; difficulty++) {
        const result = presetSchema.safeParse({
          ...validPreset,
          difficulty,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should accept all distractor complexity levels", () => {
      const levels = ["simple", "moderate", "complex"];

      levels.forEach((level) => {
        const result = presetSchema.safeParse({
          ...validPreset,
          distractorComplexity: level,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should accept all response length options", () => {
      const lengths = ["short", "medium", "long"];

      lengths.forEach((length) => {
        const result = presetSchema.safeParse({
          ...validPreset,
          expectedResponseLength: length,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should accept all bug types", () => {
      const bugTypes = ["syntax", "logic", "performance", "security"];

      bugTypes.forEach((bugType) => {
        const result = presetSchema.safeParse({
          ...validPreset,
          bugType,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should accept all code complexity levels", () => {
      const levels = ["basic", "intermediate", "advanced"];

      levels.forEach((level) => {
        const result = presetSchema.safeParse({
          ...validPreset,
          codeComplexity: level,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("invalid inputs", () => {
    it("should reject empty name", () => {
      const result = presetSchema.safeParse({
        ...validPreset,
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty label", () => {
      const result = presetSchema.safeParse({
        ...validPreset,
        label: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty icon", () => {
      const result = presetSchema.safeParse({
        ...validPreset,
        icon: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty tags array", () => {
      const result = presetSchema.safeParse({
        ...validPreset,
        tags: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject difficulty below 1", () => {
      const result = presetSchema.safeParse({
        ...validPreset,
        difficulty: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject difficulty above 5", () => {
      const result = presetSchema.safeParse({
        ...validPreset,
        difficulty: 6,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid question type", () => {
      const result = presetSchema.safeParse({
        ...validPreset,
        questionType: "invalid_type",
      });
      expect(result.success).toBe(false);
    });

    it("should reject name over 100 characters", () => {
      const result = presetSchema.safeParse({
        ...validPreset,
        name: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("createPresetSchema", () => {
  const validCreatePreset = {
    name: "new-preset",
    label: "New Preset",
    icon: "Brain",
    questionType: "open_question" as const,
    tags: ["new"],
    difficulty: 2,
  };

  it("should accept valid preset without id", () => {
    const result = createPresetSchema.safeParse(validCreatePreset);
    expect(result.success).toBe(true);
  });

  it("should ignore id if provided", () => {
    const result = createPresetSchema.safeParse({
      ...validCreatePreset,
      id: "should-be-ignored",
    });
    // The schema omits id, so it should strip it
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
    }
  });
});

describe("updatePresetSchema", () => {
  it("should accept partial update with only name", () => {
    const result = updatePresetSchema.safeParse({
      name: "updated-name",
    });
    expect(result.success).toBe(true);
  });

  it("should accept partial update with only difficulty", () => {
    const result = updatePresetSchema.safeParse({
      difficulty: 4,
    });
    expect(result.success).toBe(true);
  });

  it("should accept partial update with multiple fields", () => {
    const result = updatePresetSchema.safeParse({
      name: "updated-name",
      label: "Updated Label",
      difficulty: 5,
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty object for no updates", () => {
    const result = updatePresetSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
