/**
 * Integration tests for lib/schemas module
 *
 * Tests the complete schema export and integration
 */

import * as schemas from "@/lib/schemas";
import { describe, expect, it } from "vitest";

describe("Schema exports", () => {
  it("should export baseSchemas", () => {
    expect(schemas.baseSchemas).toBeDefined();
    expect(schemas.baseSchemas.id).toBeDefined();
    expect(schemas.baseSchemas.title).toBeDefined();
    expect(schemas.baseSchemas.email).toBeDefined();
  });

  it("should export questionSchemas", () => {
    expect(schemas.questionSchemas).toBeDefined();
    expect(schemas.questionSchemas.strict).toBeDefined();
    expect(schemas.questionSchemas.flexible).toBeDefined();
    expect(schemas.questionSchemas.multipleChoice).toBeDefined();
  });

  it("should export type guards", () => {
    expect(schemas.isMultipleChoiceQuestion).toBeDefined();
    expect(schemas.isOpenQuestion).toBeDefined();
    expect(schemas.isCodeSnippetQuestion).toBeDefined();
  });

  it("should export conversion utilities", () => {
    expect(schemas.convertToStrictQuestion).toBeDefined();
    expect(schemas.convertToStrictQuestions).toBeDefined();
  });
});

describe("Schema type inference", () => {
  it("should properly infer question types", () => {
    const mcQuestion: schemas.MultipleChoiceQuestion = {
      id: "q1",
      type: "multiple_choice",
      question: "Test?",
      options: ["A", "B", "C", "D"],
      correctAnswer: 0,
    };

    expect(schemas.isMultipleChoiceQuestion(mcQuestion)).toBe(true);
  });

  it("should properly infer flexible question types", () => {
    const flexQuestion: schemas.FlexibleQuestion = {
      id: "q1",
      type: "multiple_choice",
      question: "Test?",
      options: ["AAA", "BBB", "CCC", "DDD"],
      correctAnswer: 0,
    };

    const result = schemas.questionSchemas.flexible.safeParse(flexQuestion);
    expect(result.success).toBe(true);
  });
});
