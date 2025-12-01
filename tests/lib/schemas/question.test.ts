/**
 * Unit tests for lib/schemas/question.ts
 *
 * Tests question schema validation and type guards
 */

import {
  convertToStrictQuestion,
  convertToStrictQuestions,
  isCodeSnippetQuestion,
  isMultipleChoiceQuestion,
  isOpenQuestion,
  questionSchemas,
  type FlexibleQuestion,
} from "@/lib/schemas/question";
import {
  mockCodeSnippetQuestion,
  mockMultipleChoiceQuestion,
  mockOpenQuestion,
} from "@/tests/mocks";
import { describe, expect, it } from "vitest";

describe("questionSchemas.flexible", () => {
  describe("multiple_choice validation", () => {
    it("should validate a valid multiple choice question", () => {
      const question = {
        id: "q1",
        type: "multiple_choice" as const,
        question: "Test question?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 1,
        explanation: "Test explanation",
        keywords: ["test"],
      };
      const result = questionSchemas.flexible.safeParse(question);
      expect(result.success).toBe(true);
    });

    it("should reject multiple choice without enough options", () => {
      const question = mockMultipleChoiceQuestion({
        options: ["A", "B", "C"], // Only 3 options
      });
      const result = questionSchemas.flexible.safeParse(question);
      expect(result.success).toBe(false);
    });

    it("should reject options with less than 3 characters", () => {
      const question = mockMultipleChoiceQuestion({
        options: ["A", "BB", "CCC", "DDDD"], // First two too short
      });
      const result = questionSchemas.flexible.safeParse(question);
      expect(result.success).toBe(false);
    });

    it("should reject correctAnswer out of bounds", () => {
      const question = mockMultipleChoiceQuestion({
        options: ["AAA", "BBB", "CCC", "DDD"],
        correctAnswer: 5, // Out of bounds
      });
      const result = questionSchemas.flexible.safeParse(question);
      expect(result.success).toBe(false);
    });
  });

  describe("open_question validation", () => {
    it("should validate a valid open question", () => {
      const question = mockOpenQuestion();
      const result = questionSchemas.flexible.safeParse(question);
      expect(result.success).toBe(true);
    });

    it("should allow open question without sampleAnswer", () => {
      const question = mockOpenQuestion({ sampleAnswer: undefined });
      const result = questionSchemas.flexible.safeParse(question);
      expect(result.success).toBe(true);
    });
  });

  describe("code_snippet validation", () => {
    it("should validate a valid code snippet question", () => {
      const question = mockCodeSnippetQuestion();
      const result = questionSchemas.flexible.safeParse(question);
      expect(result.success).toBe(true);
    });

    it("should allow code snippet without optional fields", () => {
      const question = mockCodeSnippetQuestion({
        codeSnippet: undefined,
        sampleSolution: undefined,
        language: undefined,
      });
      const result = questionSchemas.flexible.safeParse(question);
      expect(result.success).toBe(true);
    });
  });

  describe("common validation", () => {
    it("should reject empty question text", () => {
      const question = mockMultipleChoiceQuestion({ question: "" });
      const result = questionSchemas.flexible.safeParse(question);
      expect(result.success).toBe(false);
    });

    it("should accept optional questionId for linked questions", () => {
      const question = {
        id: "q1",
        type: "multiple_choice" as const,
        question: "Test question?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 0,
        questionId: "db-id-123",
      };
      const result = questionSchemas.flexible.safeParse(question);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.questionId).toBe("db-id-123");
      }
    });
  });
});

describe("questionSchemas.strict", () => {
  it("should validate strict multiple choice question", () => {
    const question = {
      id: "q1",
      type: "multiple_choice" as const,
      question: "Test question?",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: 0,
    };
    const result = questionSchemas.strict.safeParse(question);
    expect(result.success).toBe(true);
  });

  it("should reject invalid question id format", () => {
    const question = {
      id: "invalid-id", // Should be q1, q2, etc.
      type: "multiple_choice" as const,
      question: "Test question?",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: 0,
    };
    const result = questionSchemas.strict.safeParse(question);
    expect(result.success).toBe(false);
  });

  it("should require sampleAnswer for open questions", () => {
    const question = {
      id: "q1",
      type: "open_question" as const,
      question: "Test question?",
      // Missing sampleAnswer
    };
    const result = questionSchemas.strict.safeParse(question);
    expect(result.success).toBe(false);
  });

  it("should require codeSnippet for code_snippet questions", () => {
    const question = {
      id: "q1",
      type: "code_snippet" as const,
      question: "Test question?",
      sampleSolution: "solution",
      language: "javascript",
      // Missing codeSnippet
    };
    const result = questionSchemas.strict.safeParse(question);
    expect(result.success).toBe(false);
  });
});

describe("Type guards", () => {
  describe("isMultipleChoiceQuestion", () => {
    it("should return true for multiple choice questions", () => {
      const question = mockMultipleChoiceQuestion();
      expect(isMultipleChoiceQuestion(question)).toBe(true);
    });

    it("should return false for other question types", () => {
      expect(isMultipleChoiceQuestion(mockOpenQuestion())).toBe(false);
      expect(isMultipleChoiceQuestion(mockCodeSnippetQuestion())).toBe(false);
    });
  });

  describe("isOpenQuestion", () => {
    it("should return true for open questions", () => {
      const question = mockOpenQuestion();
      expect(isOpenQuestion(question)).toBe(true);
    });

    it("should return false for other question types", () => {
      expect(isOpenQuestion(mockMultipleChoiceQuestion())).toBe(false);
      expect(isOpenQuestion(mockCodeSnippetQuestion())).toBe(false);
    });
  });

  describe("isCodeSnippetQuestion", () => {
    it("should return true for code snippet questions", () => {
      const question = mockCodeSnippetQuestion();
      expect(isCodeSnippetQuestion(question)).toBe(true);
    });

    it("should return false for other question types", () => {
      expect(isCodeSnippetQuestion(mockMultipleChoiceQuestion())).toBe(false);
      expect(isCodeSnippetQuestion(mockOpenQuestion())).toBe(false);
    });
  });
});

describe("convertToStrictQuestion", () => {
  it("should convert multiple choice question", () => {
    const flexible: FlexibleQuestion = {
      id: "q1",
      type: "multiple_choice",
      question: "Test?",
      options: ["AAA", "BBB", "CCC", "DDD"],
      correctAnswer: 0,
    };
    const strict = convertToStrictQuestion(flexible);
    expect(strict.type).toBe("multiple_choice");
  });

  it("should add default sampleAnswer for open questions", () => {
    const flexible: FlexibleQuestion = {
      id: "q1",
      type: "open_question",
      question: "Test?",
    };
    const strict = convertToStrictQuestion(flexible);
    expect(strict.type).toBe("open_question");
    if (strict.type === "open_question") {
      expect(strict.sampleAnswer).toBe("Sample answer to be provided");
    }
  });

  it("should add default fields for code_snippet questions", () => {
    const flexible: FlexibleQuestion = {
      id: "q1",
      type: "code_snippet",
      question: "Test?",
    };
    const strict = convertToStrictQuestion(flexible);
    expect(strict.type).toBe("code_snippet");
    if (strict.type === "code_snippet") {
      expect(strict.codeSnippet).toBe("// Code snippet to be provided");
      expect(strict.sampleSolution).toBe("// Sample solution to be provided");
      expect(strict.language).toBe("javascript");
    }
  });
});

describe("convertToStrictQuestions", () => {
  it("should convert array of flexible questions", () => {
    const flexible: FlexibleQuestion[] = [
      {
        id: "q1",
        type: "multiple_choice",
        question: "Test question?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 0,
      },
      mockOpenQuestion({ id: "q2" }),
    ];
    const strict = convertToStrictQuestions(flexible);
    expect(strict).toHaveLength(2);
    expect(strict[0].type).toBe("multiple_choice");
    expect(strict[1].type).toBe("open_question");
  });
});
