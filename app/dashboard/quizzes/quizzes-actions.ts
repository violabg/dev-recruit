import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { Question } from "@/lib/schemas";

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

export async function fetchQuizzesData({
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
    const user = await requireUser();

    const where: Prisma.QuizWhereInput = {
      createdBy: user.id,
    };

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
      include: {
        position: {
          select: {
            id: true,
            title: true,
            experienceLevel: true,
          },
        },
      },
    });

    quizzes = quizRecords.map((quiz) => ({
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
    }));

    const experienceLevels = await prisma.position.findMany({
      where: {
        createdBy: user.id,
      },
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
      where: { createdBy: user.id },
      _count: { _all: true },
    });

    const positions = await prisma.position.findMany({
      where: { createdBy: user.id },
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
