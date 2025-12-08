import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { FlexibleQuestion, SavedQuestion } from "@/lib/schemas";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import { mapQuizQuestionsToFlexible } from "@/lib/utils/question-utils";
import { cacheLife, cacheTag } from "next/cache";

// Type for quiz with linked questions from QuizQuestion join table - exported for use in interviews
export type QuizWithLinkedQuestions = Prisma.QuizGetPayload<{
  include: {
    position: {
      select: {
        id: true;
        title: true;
        experienceLevel: true;
      };
    };
    quizQuestions: {
      include: {
        question: true;
      };
      orderBy: {
        order: "asc";
      };
    };
  };
}>;

// ====================
// ENTITY TYPES
// ====================

/**
 * Quiz API response DTO - primary entity type for components.
 * Questions are now always loaded from linked Question entities.
 * Uses SavedQuestion since questions from DB always have an id.
 */
export type QuizResponse = {
  id: string;
  title: string;
  createdAt: string;
  positionId: string;
  positions: {
    id: string;
    title: string;
    experienceLevel: string;
  } | null;
  timeLimit: number | null;
  questions: SavedQuestion[];
  questionCount: number;
};

/**
 * Quiz entity for edit operations.
 */
export type QuizForEdit = {
  id: string;
  title: string;
  positionId: string;
  questions: FlexibleQuestion[];
  timeLimit: number | null;
};

/**
 * Position details returned with quiz data.
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

// Include pattern for quiz with linked questions - exported for use in interviews.ts
export const QUIZ_INCLUDE_WITH_LINKED_QUESTIONS = {
  position: {
    select: {
      id: true,
      title: true,
      experienceLevel: true,
    },
  },
  quizQuestions: {
    include: {
      question: true,
    },
    orderBy: {
      order: "asc" as const,
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
  quizQuestions: {
    include: {
      question: true,
    },
    orderBy: {
      order: "asc" as const,
    },
  },
} as const;

/**
 * Maps quiz data from Prisma to API response format.
 * Exported for use by interviews.ts
 */
export const mapQuizFromPrisma = (
  quiz: QuizWithLinkedQuestions
): QuizResponse => ({
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
  questions: mapQuizQuestionsToFlexible(quiz.quizQuestions),
  questionCount: quiz.quizQuestions.length,
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
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.QUIZZES);

  let quizzes: QuizResponse[] = [];
  let fetchError: string | null = null;
  let uniqueLevels: string[] = [];
  let totalCount = 0;

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
        include: QUIZ_INCLUDE_WITH_LINKED_QUESTIONS,
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

/**
 * Fetch quiz with full details including position information
 */
export const getQuizData = async (
  quizId: string
): Promise<{ quiz: QuizForEdit; position: PositionDetails } | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.QUIZZES);

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
    questions: mapQuizQuestionsToFlexible(quiz.quizQuestions),
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
 */
export const getQuizzesForPosition = async (
  positionId: string
): Promise<
  Array<{
    id: string;
    title: string;
    createdAt: string;
    timeLimit: number | null;
    questions: FlexibleQuestion[];
  }>
> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.QUIZZES, entityTag.position(positionId));

  const quizzes = await prisma.quiz.findMany({
    where: {
      positionId,
    },
    include: {
      quizQuestions: {
        include: {
          question: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return quizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    createdAt: quiz.createdAt.toISOString(),
    timeLimit: quiz.timeLimit,
    questions: mapQuizQuestionsToFlexible(quiz.quizQuestions),
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
 */
export const getRecentQuizIds = async (limit = 100): Promise<string[]> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.QUIZZES);

  const quizzes = await prisma.quiz.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });

  return quizzes.map((q) => q.id);
};

/**
 * Quiz detail for detail page view.
 */
export type QuizDetail = {
  id: string;
  title: string;
  positionId: string;
  timeLimit: number | null;
  questions: FlexibleQuestion[];
  createdAt: string;
  position: {
    id: string;
    title: string;
    experienceLevel: string;
  } | null;
};

/**
 * Fetch quiz by ID with position info for detail page
 */
export const getQuizById = async (
  quizId: string
): Promise<QuizDetail | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.QUIZZES, entityTag.quiz(quizId));

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId },
    include: QUIZ_INCLUDE_WITH_LINKED_QUESTIONS,
  });

  if (!quiz) {
    return null;
  }

  return {
    id: quiz.id,
    title: quiz.title,
    positionId: quiz.positionId,
    timeLimit: quiz.timeLimit,
    questions: mapQuizQuestionsToFlexible(quiz.quizQuestions),
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
