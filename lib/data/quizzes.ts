import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { Question, quizSchema } from "@/lib/schemas";
import { cacheLife, cacheTag } from "next/cache";

// Prisma types for quiz queries
type QuizWithPosition = Prisma.QuizGetPayload<{
  include: {
    position: {
      select: {
        id: true;
        title: true;
        experienceLevel: true;
      };
    };
  };
}>;

type QuizWithPositionDetails = Prisma.QuizGetPayload<{
  include: {
    position: {
      select: {
        id: true;
        title: true;
        experienceLevel: true;
        skills: true;
        description: true;
      };
    };
  };
}>;

// Exported DTO types for API consistency
type Position = {
  id: string;
  title: string;
  experience_level: string;
};

export type Quiz = {
  id: string;
  title: string;
  created_at: string;
  position_id: string;
  positions: Position | null;
  time_limit: number | null;
  questions: Question[];
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

const mapQuizFromPrisma = (quiz: QuizWithPosition): Quiz => ({
  id: quiz.id,
  title: quiz.title,
  created_at: quiz.createdAt.toISOString(),
  position_id: quiz.positionId,
  positions: quiz.position
    ? {
        id: quiz.position.id,
        title: quiz.position.title,
        experience_level: quiz.position.experienceLevel,
      }
    : null,
  time_limit: quiz.timeLimit,
  questions: Array.isArray(quiz.questions)
    ? (quiz.questions as Question[])
    : [],
});

export async function getQuizzes({
  search,
  sort,
  filter,
}: {
  search: string;
  sort: string;
  filter: string;
}) {
  let quizzes: Quiz[] = [];
  let fetchError: string | null = null;
  let uniqueLevels: string[] = [];
  let positionCounts: {
    position_id: string;
    position_title: string;
    count: number;
  }[] = [];

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

    const quizCounts = await prisma.quiz.groupBy({
      by: ["positionId"],
      _count: { _all: true },
    });

    const positions = await prisma.position.findMany({
      select: {
        id: true,
        title: true,
      },
    });

    positionCounts = positions
      .map((position) => ({
        position_id: position.id,
        position_title: position.title,
        count:
          quizCounts.find((count) => count.positionId === position.id)?._count
            ._all ?? 0,
      }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    fetchError =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    quizzes = [];
    uniqueLevels = [];
    positionCounts = [];
  }

  return {
    quizzes,
    fetchError,
    uniqueLevels,
    positionCounts,
  };
}

export async function CachedQuizzesContent({
  search,
  sort,
  filter,
}: {
  search: string;
  sort: string;
  filter: string;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag("quizzes");

  return await getQuizzes({ search, sort, filter });
}

/**
 * Fetch quiz with full details including position information
 * Cached for 1 hour and tagged for manual revalidation
 */
export const getQuizData = async (
  quizId: string
): Promise<{ quiz: any; position: any } | null> => {
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

  const hydratedQuiz = {
    id: quiz.id,
    title: quiz.title,
    position_id: quiz.positionId,
    questions: Array.isArray(quiz.questions)
      ? (quiz.questions as Question[])
      : [],
    time_limit: quiz.timeLimit,
    created_at: quiz.createdAt.toISOString(),
    created_by: quiz.createdBy,
  } as const;

  const parsedQuiz = quizSchema.safeParse(hydratedQuiz);
  if (!parsedQuiz.success) {
    return null;
  }

  const position = {
    id: quiz.position.id,
    title: quiz.position.title,
    experience_level: quiz.position.experienceLevel,
    skills: quiz.position.skills,
    description: quiz.position.description,
  };

  return { quiz: parsedQuiz.data, position };
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
    created_at: string;
    time_limit: number | null;
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
    created_at: quiz.createdAt.toISOString(),
    time_limit: quiz.timeLimit,
    questions: Array.isArray(quiz.questions)
      ? (quiz.questions as Question[])
      : [],
  }));
};
