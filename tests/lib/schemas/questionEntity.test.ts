/**
 * Tests for Question Entity Schema
 */

import {
  addQuestionsToQuizSchema,
  createQuestionSchema,
  questionEntitySchema,
  questionFilterSchema,
  removeQuestionFromQuizSchema,
  reorderQuizQuestionsSchema,
  updateQuestionSchema,
} from "@/lib/schemas/questionEntity";
import { describe, expect, it } from "vitest";

describe("createQuestionSchema", () => {
  describe("multiple_choice questions", () => {
    it("should accept valid multiple choice question", () => {
      const validQuestion = {
        type: "multiple_choice" as const,
        question: "What is 2 + 2?",
        options: ["Tre", "Quattro", "Cinque", "Sei"],
        correctAnswer: 1,
      };

      const result = createQuestionSchema.safeParse(validQuestion);
      expect(result.success).toBe(true);
    });

    it("should reject multiple choice without enough options", () => {
      const invalidQuestion = {
        type: "multiple_choice" as const,
        question: "What is 2 + 2?",
        options: ["Quattro", "Cinque"],
        correctAnswer: 0,
      };

      const result = createQuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
    });

    it("should reject multiple choice without correct answer", () => {
      const invalidQuestion = {
        type: "multiple_choice" as const,
        question: "What is 2 + 2?",
        options: ["Tre", "Quattro", "Cinque", "Sei"],
      };

      const result = createQuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
    });
  });

  describe("open_question questions", () => {
    it("should accept valid open question", () => {
      const validQuestion = {
        type: "open_question" as const,
        question: "Explain closures in JavaScript",
        sampleAnswer:
          "A closure is a function that has access to outer scope variables...",
      };

      const result = createQuestionSchema.safeParse(validQuestion);
      expect(result.success).toBe(true);
    });

    it("should reject open question without sample answer", () => {
      const invalidQuestion = {
        type: "open_question" as const,
        question: "Explain closures in JavaScript",
      };

      const result = createQuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
    });
  });

  describe("code_snippet questions", () => {
    it("should accept valid code snippet question", () => {
      const validQuestion = {
        type: "code_snippet" as const,
        question: "Fix the bug in this code",
        codeSnippet: "const arr = [1, 2, 3]; arr.push(4);",
        sampleSolution: "// Fixed code here",
        language: "javascript",
      };

      const result = createQuestionSchema.safeParse(validQuestion);
      expect(result.success).toBe(true);
    });

    it("should reject code snippet without code", () => {
      const invalidQuestion = {
        type: "code_snippet" as const,
        question: "Fix the bug",
        sampleSolution: "solution",
        language: "javascript",
      };

      const result = createQuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
    });

    it("should reject code snippet without solution", () => {
      const invalidQuestion = {
        type: "code_snippet" as const,
        question: "Fix the bug",
        codeSnippet: "const x = 1;",
        language: "javascript",
      };

      const result = createQuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
    });

    it("should reject code snippet without language", () => {
      const invalidQuestion = {
        type: "code_snippet" as const,
        question: "Fix the bug",
        codeSnippet: "const x = 1;",
        sampleSolution: "solution",
      };

      const result = createQuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
    });
  });

  describe("common fields", () => {
    it("should accept optional explanation", () => {
      const result = createQuestionSchema.safeParse({
        type: "multiple_choice",
        question: "Test question",
        options: ["Uno", "Due", "Tre", "Quattro"],
        correctAnswer: 0,
        explanation: "Because reason",
      });
      expect(result.success).toBe(true);
    });

    it("should accept optional keywords", () => {
      const result = createQuestionSchema.safeParse({
        type: "multiple_choice",
        question: "Test question",
        options: ["Uno", "Due", "Tre", "Quattro"],
        correctAnswer: 0,
        keywords: ["test", "example"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept isFavorite flag", () => {
      const result = createQuestionSchema.safeParse({
        type: "multiple_choice",
        question: "Test question",
        options: ["Uno", "Due", "Tre", "Quattro"],
        correctAnswer: 0,
        isFavorite: true,
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty question text", () => {
      const result = createQuestionSchema.safeParse({
        type: "multiple_choice",
        question: "",
        options: ["Uno", "Due", "Tre", "Quattro"],
        correctAnswer: 0,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("updateQuestionSchema", () => {
  it("should require id for updates", () => {
    const result = updateQuestionSchema.safeParse({
      question: "Updated question",
    });
    expect(result.success).toBe(false);
  });

  it("should accept update with id", () => {
    const result = updateQuestionSchema.safeParse({
      id: "question-123",
      question: "Updated question",
    });
    expect(result.success).toBe(true);
  });

  it("should accept partial update", () => {
    const result = updateQuestionSchema.safeParse({
      id: "question-123",
      isFavorite: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("questionEntitySchema", () => {
  it("should validate full question entity", () => {
    const validEntity = {
      id: "question-123",
      type: "multiple_choice",
      question: "Test question",
      keywords: ["test"],
      explanation: "Explanation",
      options: ["Uno", "Due", "Tre", "Quattro"],
      correctAnswer: 0,
      sampleAnswer: null,
      codeSnippet: null,
      sampleSolution: null,
      language: null,
      isFavorite: false,
      createdBy: "user-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = questionEntitySchema.safeParse(validEntity);
    expect(result.success).toBe(true);
  });
});

describe("addQuestionsToQuizSchema", () => {
  it("should accept valid input", () => {
    const result = addQuestionsToQuizSchema.safeParse({
      quizId: "quiz-123",
      questionIds: ["q1", "q2", "q3"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty quizId", () => {
    const result = addQuestionsToQuizSchema.safeParse({
      quizId: "",
      questionIds: ["q1"],
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty questionIds array", () => {
    const result = addQuestionsToQuizSchema.safeParse({
      quizId: "quiz-123",
      questionIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("removeQuestionFromQuizSchema", () => {
  it("should accept valid input", () => {
    const result = removeQuestionFromQuizSchema.safeParse({
      quizId: "quiz-123",
      questionId: "question-456",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty quizId", () => {
    const result = removeQuestionFromQuizSchema.safeParse({
      quizId: "",
      questionId: "question-456",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty questionId", () => {
    const result = removeQuestionFromQuizSchema.safeParse({
      quizId: "quiz-123",
      questionId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("reorderQuizQuestionsSchema", () => {
  it("should accept valid input", () => {
    const result = reorderQuizQuestionsSchema.safeParse({
      quizId: "quiz-123",
      questionIds: ["q3", "q1", "q2"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty questionIds", () => {
    const result = reorderQuizQuestionsSchema.safeParse({
      quizId: "quiz-123",
      questionIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("questionFilterSchema", () => {
  it("should accept empty filter", () => {
    const result = questionFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should apply default values", () => {
    const result = questionFilterSchema.safeParse({});
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("should accept type filter", () => {
    const result = questionFilterSchema.safeParse({
      type: "multiple_choice",
    });
    expect(result.success).toBe(true);
  });

  it("should accept favorite filter", () => {
    const result = questionFilterSchema.safeParse({
      isFavorite: true,
    });
    expect(result.success).toBe(true);
  });

  it("should accept search filter", () => {
    const result = questionFilterSchema.safeParse({
      search: "javascript",
    });
    expect(result.success).toBe(true);
  });

  it("should accept pagination params", () => {
    const result = questionFilterSchema.safeParse({
      page: 2,
      limit: 50,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it("should reject invalid page", () => {
    const result = questionFilterSchema.safeParse({
      page: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject limit over 100", () => {
    const result = questionFilterSchema.safeParse({
      limit: 101,
    });
    expect(result.success).toBe(false);
  });
});
