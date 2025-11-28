import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";
import prisma from "../prisma";
import type { QuestionType } from "../schemas/base";
import { mapQuizQuestionsToFlexible } from "../utils/question-utils";

/**
 * Questions data layer
 * Provides cached data fetching functions for the Question entity
 */

export type QuestionFilters = {
  type?: QuestionType;
  isFavorite?: boolean;
  search?: string;
  page?: number;
  limit?: number;
};

/**
 * Question entity from database with metadata
 */
export type QuestionWithMetadata = {
  id: string;
  type: QuestionType;
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
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Get all questions with optional filtering and pagination
 */
export async function getQuestions(filters: QuestionFilters = {}) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.QUESTIONS);

  const { type, isFavorite, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where = {
    ...(type && { type }),
    ...(isFavorite !== undefined && { isFavorite }),
    ...(search && {
      OR: [
        { question: { contains: search, mode: "insensitive" as const } },
        { keywords: { has: search } },
      ],
    }),
  };

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  return {
    questions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single question by ID
 */
export async function getQuestionById(id: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(entityTag.question(id));

  return prisma.question.findUnique({
    where: { id },
  });
}

/**
 * Get all favorite questions
 */
export async function getFavoriteQuestions(page = 1, limit = 20) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.QUESTIONS_FAVORITES);

  const skip = (page - 1) * limit;

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where: { isFavorite: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.question.count({ where: { isFavorite: true } }),
  ]);

  return {
    questions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get questions count by type
 */
export async function getQuestionsCountByType() {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.QUESTIONS);

  const counts = await prisma.question.groupBy({
    by: ["type"],
    _count: { id: true },
  });

  return counts.reduce((acc, { type, _count }) => {
    acc[type] = _count.id;
    return acc;
  }, {} as Record<QuestionType, number>);
}

/**
 * Get total questions count
 */
export async function getQuestionsCount() {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.QUESTIONS);

  return prisma.question.count();
}

/**
 * Get favorites count
 */
export async function getFavoritesCount() {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.QUESTIONS_FAVORITES);

  return prisma.question.count({
    where: { isFavorite: true },
  });
}

/**
 * Get questions for a quiz (via QuizQuestion join table)
 * Returns FlexibleQuestion format for consistency with quiz data layer
 */
export async function getQuizQuestions(quizId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(entityTag.quiz(quizId));

  const quizQuestions = await prisma.quizQuestion.findMany({
    where: { quizId },
    orderBy: { order: "asc" },
    include: {
      question: true,
    },
  });

  return mapQuizQuestionsToFlexible(quizQuestions);
}

/**
 * Search questions by text (for adding to quizzes)
 */
export async function searchQuestions(search: string, limit = 10) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.QUESTIONS);

  return prisma.question.findMany({
    where: {
      OR: [
        { question: { contains: search, mode: "insensitive" } },
        { keywords: { has: search } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get recent questions
 */
export async function getRecentQuestions(limit = 5) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.QUESTIONS);

  return prisma.question.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get linked question IDs for a quiz
 * Useful for checking which library questions are already in a quiz
 */
export async function getLinkedQuestionIds(quizId: string): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(entityTag.quiz(quizId));

  const quizQuestions = await prisma.quizQuestion.findMany({
    where: { quizId },
    select: { questionId: true },
  });

  return quizQuestions.map((qq) => qq.questionId);
}

/**
 * Get questions NOT already linked to a specific quiz
 * Useful for "add from library" UI
 */
export async function getAvailableQuestionsForQuiz(
  quizId: string,
  filters: Omit<QuestionFilters, "page" | "limit"> = {}
) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.QUESTIONS, entityTag.quiz(quizId));

  const { type, isFavorite, search } = filters;

  // Get already linked question IDs
  const linkedIds = await getLinkedQuestionIds(quizId);

  const where = {
    id: { notIn: linkedIds },
    ...(type && { type }),
    ...(isFavorite !== undefined && { isFavorite }),
    ...(search && {
      OR: [
        { question: { contains: search, mode: "insensitive" as const } },
        { keywords: { has: search } },
      ],
    }),
  };

  return prisma.question.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50, // Limit for performance
  });
}
