import prisma from "@/lib/prisma";
import { Question, quizSchema } from "@/lib/schemas";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Cached function to fetch quiz data
 * Tagged with 'quizzes' for cache invalidation after mutations
 */
const getQuizDataCached = async (quizId: string) => {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 86400 });
  cacheTag("quizzes");

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId },
    include: {
      position: {
        select: {
          id: true,
          title: true,
          experienceLevel: true,
          skills: true,
          description: true,
        },
      },
    },
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

export const getQuizData = async (quizId: string) => {
  return getQuizDataCached(quizId);
};

/**
 * Cached function to fetch position data
 * Tagged with 'positions' for cache invalidation
 */
const getPositionDataCached = async (positionId: string) => {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 86400 });
  cacheTag("positions");

  const position = await prisma.position.findFirst({
    where: { id: positionId },
    select: {
      id: true,
      title: true,
      experienceLevel: true,
      skills: true,
      description: true,
    },
  });

  if (!position) {
    return null;
  }

  return {
    id: position.id,
    title: position.title,
    experience_level: position.experienceLevel,
    skills: position.skills,
    description: position.description,
  };
};

export const getPositionData = async (positionId: string) => {
  return getPositionDataCached(positionId);
};

/**
 * Cached function to fetch all quizzes for a position
 * Tagged with 'quizzes' for cache invalidation
 */
const getQuizzesForPositionCached = async (positionId: string) => {
  "use cache";
  cacheLife({ stale: 1800, revalidate: 43200 });
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

export const getQuizzesForPosition = async (positionId: string) => {
  return getQuizzesForPositionCached(positionId);
};
