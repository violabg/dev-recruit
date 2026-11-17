/**
 * Unit tests for lib/utils/question-utils.ts
 *
 * Tests question utility functions for entity operations
 */

import {
  mapQuizQuestionsToFlexible,
  prepareQuestionForCreate,
  prepareQuestionForUpdate,
} from "@/lib/utils/question-utils";
import { mockMultipleChoiceQuestion, mockOpenQuestion } from "@/tests/mocks";
import { describe, expect, it } from "vitest";

describe("mapQuizQuestionsToFlexible", () => {
  it("should map quiz questions to flexible format", () => {
    const quizQuestions = [
      {
        order: 0,
        criterionIds: [],
        question: {
          id: "question-1",
          type: "multiple_choice",
          question: "Test question 1?",
          keywords: ["test"],
          explanation: "Test explanation",
          options: ["A", "B", "C", "D"],
          correctAnswer: 1,
          sampleAnswer: null,
          codeSnippet: null,
          sampleSolution: null,
          language: null,
          isFavorite: false,
        },
      },
      {
        order: 1,
        criterionIds: [],
        question: {
          id: "question-2",
          type: "open_question",
          question: "Test question 2?",
          keywords: ["open"],
          explanation: null,
          options: [],
          correctAnswer: null,
          sampleAnswer: "Sample answer",
          codeSnippet: null,
          sampleSolution: null,
          language: null,
          isFavorite: true,
        },
      },
    ];

    const result = mapQuizQuestionsToFlexible(quizQuestions);

    expect(result).toHaveLength(2);

    // First question - dbId is now the database ID directly
    expect(result[0].dbId).toBe("question-1");
    expect(result[0].type).toBe("multiple_choice");
    expect(result[0].question).toBe("Test question 1?");
    expect(result[0].options).toEqual(["A", "B", "C", "D"]);
    expect(result[0].correctAnswer).toBe(1);
    expect(result[0].explanation).toBe("Test explanation");
    expect(result[0].isFavorite).toBe(false);

    // Second question
    expect(result[1].dbId).toBe("question-2");
    expect(result[1].type).toBe("open_question");
    expect(result[1].sampleAnswer).toBe("Sample answer");
    expect(result[1].isFavorite).toBe(true);
  });

  it("should handle empty array", () => {
    const result = mapQuizQuestionsToFlexible([]);
    expect(result).toEqual([]);
  });

  it("should convert null values to undefined", () => {
    const quizQuestions = [
      {
        order: 0,
        criterionIds: [],
        question: {
          id: "question-1",
          type: "multiple_choice",
          question: "Test?",
          keywords: [],
          explanation: null, // null should become undefined
          options: ["A", "B", "C", "D"],
          correctAnswer: 0,
          sampleAnswer: null,
          codeSnippet: null,
          sampleSolution: null,
          language: null,
          isFavorite: false,
        },
      },
    ];

    const result = mapQuizQuestionsToFlexible(quizQuestions);

    expect(result[0].explanation).toBeUndefined();
    expect(result[0].sampleAnswer).toBeUndefined();
    expect(result[0].codeSnippet).toBeUndefined();
  });
});

describe("prepareQuestionForCreate", () => {
  it("should prepare multiple choice question for create", () => {
    const question = mockMultipleChoiceQuestion();
    const userId = "user-123";

    const result = prepareQuestionForCreate(question, userId);

    expect(result.type).toBe("multiple_choice");
    expect(result.question).toBe(question.question);
    expect(result.options).toEqual(question.options);
    expect(result.correctAnswer).toBe(question.correctAnswer);
    expect(result.keywords).toEqual(question.keywords);
    expect(result.explanation).toBe(question.explanation);
    expect(result.createdBy).toBe(userId);
    expect(result.isFavorite).toBe(false);
  });

  it("should prepare open question for create", () => {
    const question = mockOpenQuestion();
    const userId = "user-456";

    const result = prepareQuestionForCreate(question, userId);

    expect(result.type).toBe("open_question");
    expect(result.sampleAnswer).toBe(question.sampleAnswer);
    expect(result.createdBy).toBe(userId);
  });

  it("should handle missing optional fields", () => {
    const question = {
      dbId: "q1",
      type: "multiple_choice" as const,
      question: "Test?",
    };
    const userId = "user-789";

    const result = prepareQuestionForCreate(question, userId);

    expect(result.options).toEqual([]);
    expect(result.keywords).toEqual([]);
    expect(result.isFavorite).toBe(false);
  });

  it("should preserve isFavorite when set", () => {
    const question = mockMultipleChoiceQuestion({ isFavorite: true });
    const userId = "user-123";

    const result = prepareQuestionForCreate(question, userId);

    expect(result.isFavorite).toBe(true);
  });
});

describe("prepareQuestionForUpdate", () => {
  it("should prepare question for update without createdBy", () => {
    const question = mockMultipleChoiceQuestion();

    const result = prepareQuestionForUpdate(question);

    expect(result.type).toBe("multiple_choice");
    expect(result.question).toBe(question.question);
    expect(result).not.toHaveProperty("createdBy");
    expect(result).not.toHaveProperty("isFavorite");
  });

  it("should handle all question types", () => {
    const mcQuestion = mockMultipleChoiceQuestion();
    const openQuestion = mockOpenQuestion();

    const mcResult = prepareQuestionForUpdate(mcQuestion);
    const openResult = prepareQuestionForUpdate(openQuestion);

    expect(mcResult.options).toEqual(mcQuestion.options);
    expect(openResult.sampleAnswer).toBe(openQuestion.sampleAnswer);
  });
});

describe("criterionIds belong to the quiz-question link", () => {
  const link = (criterionIds: string[]) => ({
    order: 0,
    criterionIds,
    question: {
      id: "question-1",
      type: "open_question",
      question: "Spiega le closure",
      keywords: [],
      explanation: null,
      options: [],
      correctAnswer: null,
      sampleAnswer: "Risposta",
      codeSnippet: null,
      sampleSolution: null,
      language: null,
      isFavorite: true,
    },
  });

  it("mapQuizQuestionsToFlexible returns the criterionIds of the link", () => {
    const [first, second] = mapQuizQuestionsToFlexible([
      link(["c-1", "c-2"]),
      link([]),
    ]);
    expect(first.criterionIds).toEqual(["c-1", "c-2"]);
    expect(second.criterionIds).toEqual([]);
  });

  it("the same question row keeps independent lists in two quizzes", () => {
    const [inQuizA] = mapQuizQuestionsToFlexible([link(["c-1"])]);
    const [inQuizB] = mapQuizQuestionsToFlexible([link(["c-9"])]);
    expect(inQuizA.dbId).toBe(inQuizB.dbId);
    expect(inQuizA.criterionIds).not.toEqual(inQuizB.criterionIds);
  });

  it("prepareQuestionForCreate never writes criterionIds on the Question row", () => {
    const data = prepareQuestionForCreate(
      mockOpenQuestion({ criterionIds: ["c-1"] }),
      "user-1",
    );
    expect(data).not.toHaveProperty("criterionIds");
  });

  it("prepareQuestionForUpdate never writes criterionIds on the Question row", () => {
    const data = prepareQuestionForUpdate(
      mockMultipleChoiceQuestion({ criterionIds: ["c-1"] }),
    );
    expect(data).not.toHaveProperty("criterionIds");
  });
});
