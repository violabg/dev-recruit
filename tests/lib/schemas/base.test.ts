/**
 * Unit tests for lib/schemas/base.ts
 *
 * Tests base schema validation for common fields
 */

import {
  baseSchemas,
  commonSchemas,
  formTransformers,
} from "@/lib/schemas/base";
import { describe, expect, it } from "vitest";

describe("baseSchemas", () => {
  describe("id", () => {
    it("should accept valid id", () => {
      expect(baseSchemas.id.safeParse("user-123").success).toBe(true);
      expect(baseSchemas.id.safeParse("cm123abc456def789").success).toBe(true);
    });

    it("should reject empty id", () => {
      expect(baseSchemas.id.safeParse("").success).toBe(false);
    });
  });

  describe("title", () => {
    it("should accept valid title", () => {
      expect(baseSchemas.title.safeParse("Valid Title").success).toBe(true);
    });

    it("should reject title that is too short", () => {
      expect(baseSchemas.title.safeParse("A").success).toBe(false);
    });

    it("should reject title that is too long", () => {
      const longTitle = "a".repeat(201);
      expect(baseSchemas.title.safeParse(longTitle).success).toBe(false);
    });

    it("should trim whitespace", () => {
      const result = baseSchemas.title.safeParse("  Title  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("Title");
      }
    });
  });

  describe("description", () => {
    it("should accept valid description", () => {
      expect(baseSchemas.description.safeParse("A description").success).toBe(
        true
      );
    });

    it("should accept undefined", () => {
      expect(baseSchemas.description.safeParse(undefined).success).toBe(true);
    });

    it("should reject description that is too long", () => {
      const longDesc = "a".repeat(2001);
      expect(baseSchemas.description.safeParse(longDesc).success).toBe(false);
    });
  });

  describe("email", () => {
    it("should accept valid email", () => {
      expect(baseSchemas.email.safeParse("test@example.com").success).toBe(
        true
      );
    });

    it("should reject invalid email", () => {
      expect(baseSchemas.email.safeParse("not-an-email").success).toBe(false);
      expect(baseSchemas.email.safeParse("missing@domain").success).toBe(false);
    });
  });

  describe("password", () => {
    it("should accept valid password", () => {
      expect(baseSchemas.password.safeParse("password123").success).toBe(true);
    });

    it("should reject password that is too short", () => {
      expect(baseSchemas.password.safeParse("12345").success).toBe(false);
    });
  });

  describe("name", () => {
    it("should accept valid name", () => {
      expect(baseSchemas.name.safeParse("Mario Rossi").success).toBe(true);
    });

    it("should reject name that is too short", () => {
      expect(baseSchemas.name.safeParse("M").success).toBe(false);
    });
  });

  describe("difficulty", () => {
    it("should accept valid difficulty (1-5)", () => {
      expect(baseSchemas.difficulty.safeParse(1).success).toBe(true);
      expect(baseSchemas.difficulty.safeParse(3).success).toBe(true);
      expect(baseSchemas.difficulty.safeParse(5).success).toBe(true);
    });

    it("should reject difficulty out of range", () => {
      expect(baseSchemas.difficulty.safeParse(0).success).toBe(false);
      expect(baseSchemas.difficulty.safeParse(6).success).toBe(false);
    });

    it("should reject non-integer", () => {
      expect(baseSchemas.difficulty.safeParse(2.5).success).toBe(false);
    });
  });

  describe("questionCount", () => {
    it("should accept valid question count (1-50)", () => {
      expect(baseSchemas.questionCount.safeParse(1).success).toBe(true);
      expect(baseSchemas.questionCount.safeParse(25).success).toBe(true);
      expect(baseSchemas.questionCount.safeParse(50).success).toBe(true);
    });

    it("should reject question count out of range", () => {
      expect(baseSchemas.questionCount.safeParse(0).success).toBe(false);
      expect(baseSchemas.questionCount.safeParse(51).success).toBe(false);
    });
  });

  describe("timeLimit", () => {
    it("should accept valid time limit (5-120)", () => {
      expect(baseSchemas.timeLimit.safeParse(5).success).toBe(true);
      expect(baseSchemas.timeLimit.safeParse(60).success).toBe(true);
      expect(baseSchemas.timeLimit.safeParse(120).success).toBe(true);
    });

    it("should accept null", () => {
      expect(baseSchemas.timeLimit.safeParse(null).success).toBe(true);
    });

    it("should coerce string to number", () => {
      const result = baseSchemas.timeLimit.safeParse("30");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(30);
      }
    });

    it("should reject time limit out of range", () => {
      expect(baseSchemas.timeLimit.safeParse(4).success).toBe(false);
      expect(baseSchemas.timeLimit.safeParse(121).success).toBe(false);
    });
  });

  describe("score", () => {
    it("should accept valid score (0-10)", () => {
      expect(baseSchemas.score.safeParse(0).success).toBe(true);
      expect(baseSchemas.score.safeParse(5.5).success).toBe(true);
      expect(baseSchemas.score.safeParse(10).success).toBe(true);
    });

    it("should reject score out of range", () => {
      expect(baseSchemas.score.safeParse(-1).success).toBe(false);
      expect(baseSchemas.score.safeParse(11).success).toBe(false);
    });
  });

  describe("questionType", () => {
    it("should accept valid question types", () => {
      expect(
        baseSchemas.questionType.safeParse("multiple_choice").success
      ).toBe(true);
      expect(baseSchemas.questionType.safeParse("open_question").success).toBe(
        true
      );
      expect(baseSchemas.questionType.safeParse("code_snippet").success).toBe(
        true
      );
    });

    it("should reject invalid question type", () => {
      expect(baseSchemas.questionType.safeParse("invalid").success).toBe(false);
    });
  });

  describe("experienceLevel", () => {
    it("should accept valid experience levels", () => {
      expect(baseSchemas.experienceLevel.safeParse("junior").success).toBe(
        true
      );
      expect(baseSchemas.experienceLevel.safeParse("mid").success).toBe(true);
      expect(baseSchemas.experienceLevel.safeParse("senior").success).toBe(
        true
      );
      expect(baseSchemas.experienceLevel.safeParse("lead").success).toBe(true);
    });

    it("should reject invalid experience level", () => {
      expect(baseSchemas.experienceLevel.safeParse("invalid").success).toBe(
        false
      );
    });
  });

  describe("contractType", () => {
    it("should accept valid contract types", () => {
      expect(baseSchemas.contractType.safeParse("full-time").success).toBe(
        true
      );
      expect(baseSchemas.contractType.safeParse("part-time").success).toBe(
        true
      );
      expect(baseSchemas.contractType.safeParse("contract").success).toBe(true);
      expect(baseSchemas.contractType.safeParse("internship").success).toBe(
        true
      );
    });
  });

  describe("interviewStatus", () => {
    it("should accept valid interview statuses", () => {
      expect(baseSchemas.interviewStatus.safeParse("pending").success).toBe(
        true
      );
      expect(baseSchemas.interviewStatus.safeParse("in_progress").success).toBe(
        true
      );
      expect(baseSchemas.interviewStatus.safeParse("completed").success).toBe(
        true
      );
      expect(baseSchemas.interviewStatus.safeParse("cancelled").success).toBe(
        true
      );
    });
  });

  describe("candidateStatus", () => {
    it("should accept valid candidate statuses", () => {
      expect(baseSchemas.candidateStatus.safeParse("pending").success).toBe(
        true
      );
      expect(baseSchemas.candidateStatus.safeParse("in_progress").success).toBe(
        true
      );
      expect(baseSchemas.candidateStatus.safeParse("completed").success).toBe(
        true
      );
      expect(baseSchemas.candidateStatus.safeParse("hired").success).toBe(true);
      expect(baseSchemas.candidateStatus.safeParse("rejected").success).toBe(
        true
      );
    });
  });
});

describe("commonSchemas", () => {
  describe("pagination", () => {
    it("should accept valid pagination", () => {
      const result = commonSchemas.pagination.safeParse({ page: 2, limit: 20 });
      expect(result.success).toBe(true);
    });

    it("should use defaults when not provided", () => {
      const result = commonSchemas.pagination.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it("should reject invalid page", () => {
      expect(
        commonSchemas.pagination.safeParse({ page: 0, limit: 10 }).success
      ).toBe(false);
    });

    it("should reject limit > 100", () => {
      expect(
        commonSchemas.pagination.safeParse({ page: 1, limit: 101 }).success
      ).toBe(false);
    });
  });
});

describe("formTransformers", () => {
  describe("stringToBoolean", () => {
    it("should transform 'true' to true", () => {
      const result = formTransformers.stringToBoolean.safeParse("true");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it("should transform 'false' to false", () => {
      const result = formTransformers.stringToBoolean.safeParse("false");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });

  describe("stringToArray", () => {
    it("should split comma-separated string", () => {
      const result = formTransformers.stringToArray.safeParse(
        "react, typescript, node"
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(["react", "typescript", "node"]);
      }
    });

    it("should filter empty values", () => {
      const result = formTransformers.stringToArray.safeParse("react,,node");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(["react", "node"]);
      }
    });
  });

  describe("coerceNumber", () => {
    it("should coerce string to number", () => {
      const result = formTransformers.coerceNumber.safeParse("42");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });
  });
});
