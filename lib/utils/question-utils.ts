/**
 * Shared utilities for Question entity operations
 * Used by both quiz and question actions/data layers
 */
import type { FlexibleQuestion, SavedQuestion } from "@/lib/schemas";

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
    isFavorite: boolean;
  };
};

/**
 * Convert linked questions from QuizQuestion join table to SavedQuestion format
 * Returns SavedQuestion[] since questions from DB always have an id.
 * Shared between quizzes.ts and questions.ts data layers
 */
export function mapQuizQuestionsToFlexible(
  quizQuestions: QuizQuestionWithQuestion[]
): SavedQuestion[] {
  return quizQuestions.map((qq) => ({
    dbId: qq.question.id, // Database ID
    type: qq.question.type as SavedQuestion["type"],
    question: qq.question.question,
    keywords: qq.question.keywords,
    explanation: qq.question.explanation || undefined,
    options: qq.question.options,
    correctAnswer: qq.question.correctAnswer ?? undefined,
    sampleAnswer: qq.question.sampleAnswer || undefined,
    codeSnippet: qq.question.codeSnippet || undefined,
    sampleSolution: qq.question.sampleSolution || undefined,
    language: qq.question.language || undefined,
    isFavorite: qq.question.isFavorite,
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
    isFavorite: question.isFavorite ?? false,
    createdBy: userId,
  };
}

/**
 * Prepare question data for Prisma update operation
 * Converts FlexibleQuestion to the shape needed for prisma.question.update
 * Does NOT include createdBy as that should not change on update
 */
export function prepareQuestionForUpdate(question: FlexibleQuestion) {
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
    // isFavorite is not updated here - it's managed separately
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
