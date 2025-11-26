import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
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

/**
 * Paginated quizzes result type
 */
export type PaginatedQuizzes = {
  quizzes: QuizResponse[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  fetchError: string | null;
  uniqueLevels: string[];
};

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
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  search: string;
  sort: string;
  filter: string;
  positionId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedQuizzes> {
  let quizzes: QuizResponse[] = [];
  let fetchError: string | null = null;
  let uniqueLevels: string[] = [];
  let totalCount = 0;

  // Avoid Math.max() which calls .valueOf() and fails with temporary client references
  const normalizedPage = typeof page === "number" && page > 0 ? page : 1;
  const normalizedPageSize =
    typeof pageSize === "number" && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;

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

    const [quizRecords, count] = await Promise.all([
      prisma.quiz.findMany({
        where,
        orderBy,
        include: QUIZ_INCLUDE_WITH_POSITION,
        skip: (normalizedPage - 1) * normalizedPageSize,
        take: normalizedPageSize,
      }),
      prisma.quiz.count({ where }),
    ]);

    quizzes = quizRecords.map(mapQuizFromPrisma);
    totalCount = count;

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

  const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));

  return {
    quizzes,
    fetchError,
    uniqueLevels,
    totalCount,
    currentPage: normalizedPage,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPrevPage: normalizedPage > 1,
  };
}

export async function CachedQuizzesContent({
  search,
  sort,
  filter,
  positionId,
  page,
  pageSize,
}: {
  search: string;
  sort: string;
  filter: string;
  positionId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedQuizzes> {
  "use cache";
  cacheLife("hours");
  cacheTag("quizzes");

  return await getQuizzes({ search, sort, filter, positionId, page, pageSize });
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

// ===================
// FILTER OPTIONS
// ===================

export type QuizFilterOptions = {
  uniqueLevels: string[];
  positions: Array<{ id: string; title: string }>;
};

/**
 * Returns last N quiz IDs for generateStaticParams.
 * Used to pre-render most recent quiz detail pages at build time.
 */
export const getRecentQuizIds = async (limit = 100): Promise<string[]> => {
  "use cache";
  cacheLife("hours");
  cacheTag("quizzes");

  const quizzes = await prisma.quiz.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });

  return quizzes.map((q) => q.id);
};

/**
 * Quiz detail for detail page view.
 * Includes position info for display.
 */
export type QuizDetail = {
  id: string;
  title: string;
  positionId: string;
  timeLimit: number | null;
  questions: Question[];
  createdAt: string;
  position: {
    id: string;
    title: string;
    experienceLevel: string;
  } | null;
};

/**
 * Fetch quiz by ID with position info for detail page
 * Cached for 1 hour and tagged for manual revalidation
 */
export const getQuizById = async (
  quizId: string
): Promise<QuizDetail | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag("quizzes", `quiz-${quizId}`);

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId },
    include: QUIZ_INCLUDE_WITH_POSITION,
  });

  if (!quiz) {
    return null;
  }

  return {
    id: quiz.id,
    title: quiz.title,
    positionId: quiz.positionId,
    timeLimit: quiz.timeLimit,
    questions: Array.isArray(quiz.questions)
      ? (quiz.questions as Question[])
      : [],
    createdAt: quiz.createdAt.toISOString(),
    position: quiz.position
      ? {
          id: quiz.position.id,
          title: quiz.position.title,
          experienceLevel: quiz.position.experienceLevel,
        }
      : null,
  };
};

/**
 * Cached filter options for quiz list page
 * Returns unique experience levels and positions for filter dropdowns
 * Tagged with both "quizzes" and "positions" for proper revalidation
 */
export async function CachedQuizFilterOptions(): Promise<QuizFilterOptions> {
  "use cache";
  cacheLife("hours");
  cacheTag("quizzes", "positions");

  try {
    const [experienceLevels, positions] = await Promise.all([
      prisma.position.findMany({
        where: {},
        select: { experienceLevel: true },
      }),
      prisma.position.findMany({
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
    ]);

    const uniqueLevels = Array.from(
      new Set(
        experienceLevels
          .map((item) => item.experienceLevel)
          .filter((level): level is string => Boolean(level))
      )
    );

    return {
      uniqueLevels,
      positions: positions.map((p) => ({ id: p.id, title: p.title })),
    };
  } catch (error) {
    console.error("Failed to fetch filter options:", error);
    return { uniqueLevels: [], positions: [] };
  }
}
