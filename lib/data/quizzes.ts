import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { FlexibleQuestion, Question } from "@/lib/schemas";
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

// Type for quiz with linked questions from QuizQuestion join table
type QuizWithLinkedQuestions = Prisma.QuizGetPayload<{
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
  questions: FlexibleQuestion[];
};

/**
 * Quiz entity for edit operations.
 * Minimal shape for form editing - excludes position relation.
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

// Include pattern for quiz with linked questions
const QUIZ_INCLUDE_WITH_LINKED_QUESTIONS = {
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

/**
 * Convert linked questions from QuizQuestion to FlexibleQuestion format
 * Used when quiz has questions stored in the Question entity
 */
const mapLinkedQuestionsToQuestionFormat = (
  quizQuestions: QuizWithLinkedQuestions["quizQuestions"]
): FlexibleQuestion[] => {
  return quizQuestions.map((qq) => ({
    id: `q${qq.order + 1}`, // Convert to q1, q2 format for compatibility
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
};

/**
 * Get questions for a quiz - prefers linked questions over JSON
 * Returns questions from QuizQuestion join table if available,
 * otherwise falls back to inline JSON questions
 */
const getQuestionsForQuiz = (
  quiz: QuizWithPosition | QuizWithLinkedQuestions
): FlexibleQuestion[] => {
  // Check if quiz has linked questions
  if ("quizQuestions" in quiz && quiz.quizQuestions.length > 0) {
    return mapLinkedQuestionsToQuestionFormat(quiz.quizQuestions);
  }

  // Fall back to inline JSON questions
  return Array.isArray(quiz.questions)
    ? (quiz.questions as FlexibleQuestion[])
    : [];
};

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
 * Supports both inline JSON questions and linked Question entities
 */
export const getQuizData = async (
  quizId: string
): Promise<{ quiz: QuizForEdit; position: PositionDetails } | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag("quizzes");

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId },
    include: {
      ...QUIZ_INCLUDE_WITH_POSITION_DETAILS,
      quizQuestions: {
        include: {
          question: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!quiz || !quiz.position) {
    return null;
  }

  // Prefer linked questions over inline JSON
  const questions: FlexibleQuestion[] =
    quiz.quizQuestions.length > 0
      ? mapLinkedQuestionsToQuestionFormat(quiz.quizQuestions)
      : Array.isArray(quiz.questions)
      ? (quiz.questions as FlexibleQuestion[])
      : [];

  const hydratedQuiz: QuizForEdit = {
    id: quiz.id,
    title: quiz.title,
    positionId: quiz.positionId,
    questions,
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
 * Supports both inline JSON questions and linked Question entities
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
    questions:
      quiz.quizQuestions.length > 0
        ? mapLinkedQuestionsToQuestionFormat(quiz.quizQuestions)
        : Array.isArray(quiz.questions)
        ? (quiz.questions as FlexibleQuestion[])
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
  questions: FlexibleQuestion[];
  createdAt: string;
  position: {
    id: string;
    title: string;
    experienceLevel: string;
  } | null;
  /** Whether questions are stored as linked entities vs inline JSON */
  hasLinkedQuestions?: boolean;
};

/**
 * Fetch quiz by ID with position info for detail page
 * Cached for 1 hour and tagged for manual revalidation
 * Supports both inline JSON questions and linked Question entities
 */
export const getQuizById = async (
  quizId: string
): Promise<QuizDetail | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag("quizzes", `quiz-${quizId}`);

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
    questions: getQuestionsForQuiz(quiz),
    createdAt: quiz.createdAt.toISOString(),
    position: quiz.position
      ? {
          id: quiz.position.id,
          title: quiz.position.title,
          experienceLevel: quiz.position.experienceLevel,
        }
      : null,
    // Include metadata about question storage
    hasLinkedQuestions: quiz.quizQuestions.length > 0,
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
