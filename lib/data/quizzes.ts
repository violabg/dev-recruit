import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { Question } from "@/lib/schemas";
import { cacheLife, cacheTag } from "next/cache";

// Prisma types for quiz queries - unified with optional position fields
type QuizWithPosition = Prisma.QuizGetPayload<{
  include: {
    position: {
      select: {
        id: true;
        title: true;
        experienceLevel: true;
        // Additional fields like skills and description are optional
        // and will be available when the query includes them
      };
    };
  };
}>;

// ====================
// ENTITY TYPES
// ====================
// These are the canonical entity types for quiz data.
// Use Prisma types as base, with typed JSON fields.

/**
 * Quiz API response DTO - primary entity type for components.
 * Extends Prisma model with typed questions array.
 * Use this for component props and API responses.
 */
export type QuizResponse = {
  id: string;
  title: string;
  createdAt: string; // ISO string from Prisma createdAt
  positionId: string;
  positions: {
    id: string;
    title: string;
    experienceLevel: string;
  } | null;
  timeLimit: number | null;
  questions: Question[];
};

/**
 * Quiz entity for edit operations.
 * Minimal shape for form editing - excludes position relation.
 */
export type QuizForEdit = {
  id: string;
  title: string;
  positionId: string;
  questions: Question[];
  timeLimit: number | null;
};

/**
 * Position details returned with quiz data.
 * Used by quiz edit forms to access position context.
 */
export type PositionDetails = {
  id: string;
  title: string;
  experienceLevel: string;
  skills: string[];
  description: string | null;
};

// Backward compatibility alias
export type Quiz = QuizResponse;

// Reusable include patterns for quiz queries
const QUIZ_INCLUDE_WITH_POSITION = {
  position: {
    select: {
      id: true,
      title: true,
      experienceLevel: true,
    },
  },
} as const;

const QUIZ_INCLUDE_WITH_POSITION_DETAILS = {
  position: {
    select: {
      id: true,
      title: true,
      experienceLevel: true,
      skills: true,
      description: true,
    },
  },
} as const;

/**
 * Maps quiz data from Prisma to API response format.
 * Handles both basic position and detailed position includes.
 * Additional position fields (skills, description) are ignored in this mapping
 * as the QuizResponse type only needs id, title, and experienceLevel.
 */
export const mapQuizFromPrisma = (quiz: QuizWithPosition): QuizResponse => ({
  id: quiz.id,
  title: quiz.title,
  createdAt: quiz.createdAt.toISOString(),
  positionId: quiz.positionId,
  positions: quiz.position
    ? {
        id: quiz.position.id,
        title: quiz.position.title,
        experienceLevel: quiz.position.experienceLevel,
      }
    : null,
  timeLimit: quiz.timeLimit,
  questions: Array.isArray(quiz.questions)
    ? (quiz.questions as Question[])
    : [],
});

export async function getQuizzes({
  search,
  sort,
  filter,
  positionId,
}: {
  search: string;
  sort: string;
  filter: string;
  positionId?: string;
}) {
  let quizzes: QuizResponse[] = [];
  let fetchError: string | null = null;
  let uniqueLevels: string[] = [];

  try {
    const where: Prisma.QuizWhereInput = {};

    if (search) {
      where.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (filter !== "all") {
      where.position = {
        experienceLevel: filter,
      };
    }

    if (positionId && positionId !== "all") {
      where.positionId = positionId;
    }

    const orderByMap: Record<string, Prisma.QuizOrderByWithRelationInput> = {
      newest: { createdAt: "desc" },
      oldest: { createdAt: "asc" },
      "a-z": { title: "asc" },
      "z-a": { title: "desc" },
    };

    const orderBy = orderByMap[sort] ?? orderByMap.newest;

    const quizRecords = await prisma.quiz.findMany({
      where,
      orderBy,
      include: QUIZ_INCLUDE_WITH_POSITION,
    });

    quizzes = quizRecords.map(mapQuizFromPrisma);

    const experienceLevels = await prisma.position.findMany({
      where: {},
      select: { experienceLevel: true },
    });

    uniqueLevels = Array.from(
      new Set(
        experienceLevels
          .map((item) => item.experienceLevel)
          .filter((level): level is string => Boolean(level))
      )
    );
  } catch (error) {
    fetchError =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    quizzes = [];
    uniqueLevels = [];
  }

  return {
    quizzes,
    fetchError,
    uniqueLevels,
  };
}

export async function CachedQuizzesContent({
  search,
  sort,
  filter,
  positionId,
}: {
  search: string;
  sort: string;
  filter: string;
  positionId?: string;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag("quizzes");

  return await getQuizzes({ search, sort, filter, positionId });
}

/**
 * Fetch quiz with full details including position information
 * Cached for 1 hour and tagged for manual revalidation
 */
export const getQuizData = async (
  quizId: string
): Promise<{ quiz: QuizForEdit; position: PositionDetails } | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag("quizzes");

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId },
    include: QUIZ_INCLUDE_WITH_POSITION_DETAILS,
  });

  if (!quiz || !quiz.position) {
    return null;
  }

  const hydratedQuiz: QuizForEdit = {
    id: quiz.id,
    title: quiz.title,
    positionId: quiz.positionId,
    questions: Array.isArray(quiz.questions)
      ? (quiz.questions as Question[])
      : [],
    timeLimit: quiz.timeLimit,
  };

  const position: PositionDetails = {
    id: quiz.position.id,
    title: quiz.position.title,
    experienceLevel: quiz.position.experienceLevel,
    skills: quiz.position.skills as string[],
    description: quiz.position.description,
  };

  return { quiz: hydratedQuiz, position };
};

/**
 * Fetch all quizzes for a specific position
 * Cached for 1 hour and tagged for manual revalidation
 */
export const getQuizzesForPosition = async (
  positionId: string
): Promise<
  Array<{
    id: string;
    title: string;
    createdAt: string;
    timeLimit: number | null;
    questions: Question[];
  }>
> => {
  "use cache";
  cacheLife("hours");
  cacheTag("quizzes");

  const quizzes = await prisma.quiz.findMany({
    where: {
      positionId,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      timeLimit: true,
      questions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return quizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    createdAt: quiz.createdAt.toISOString(),
    timeLimit: quiz.timeLimit,
    questions: Array.isArray(quiz.questions)
      ? (quiz.questions as Question[])
      : [],
  }));
};
