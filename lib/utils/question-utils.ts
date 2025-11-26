/**
 * Shared utilities for Question entity operations
 * Used by both quiz and question actions/data layers
 */
import type { FlexibleQuestion } from "@/lib/schemas";

type QuizQuestionWithQuestion = {
  order: number;
  question: {
    id: string;
    type: string;
    question: string;
    keywords: string[];
    explanation: string | null;
    options: string[];
    correctAnswer: number | null;
    sampleAnswer: string | null;
    codeSnippet: string | null;
    sampleSolution: string | null;
    language: string | null;
  };
};

/**
 * Convert linked questions from QuizQuestion join table to FlexibleQuestion format
 * Shared between quizzes.ts and questions.ts data layers
 */
export function mapQuizQuestionsToFlexible(
  quizQuestions: QuizQuestionWithQuestion[]
): FlexibleQuestion[] {
  return quizQuestions.map((qq) => ({
    id: `q${qq.order + 1}`,
    type: qq.question.type as FlexibleQuestion["type"],
    question: qq.question.question,
    keywords: qq.question.keywords,
    explanation: qq.question.explanation || undefined,
    options: qq.question.options,
    correctAnswer: qq.question.correctAnswer ?? undefined,
    sampleAnswer: qq.question.sampleAnswer || undefined,
    codeSnippet: qq.question.codeSnippet || undefined,
    sampleSolution: qq.question.sampleSolution || undefined,
    language: qq.question.language || undefined,
  }));
}

/**
 * Prepare question data for Prisma create operation
 * Converts FlexibleQuestion to the shape needed for prisma.question.create
 */
export function prepareQuestionForCreate(
  question: FlexibleQuestion,
  userId: string
) {
  return {
    type: question.type,
    question: question.question,
    keywords: question.keywords || [],
    explanation: question.explanation,
    options: question.options || [],
    correctAnswer: question.correctAnswer,
    sampleAnswer: question.sampleAnswer,
    codeSnippet: question.codeSnippet,
    sampleSolution: question.sampleSolution,
    language: question.language,
    isFavorite: false,
    createdBy: userId,
  };
}

/**
 * Prepare multiple questions for bulk create
 */
export function prepareQuestionsForBulkCreate(
  questions: FlexibleQuestion[],
  userId: string
) {
  return questions.map((q) => prepareQuestionForCreate(q, userId));
}
