import { requireUser } from "@/lib/auth-server";
import { mapQuizFromPrismaDetails, Quiz } from "@/lib/data/quizzes";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import type {
  AssignedInterview,
  CandidateQuizData,
  InterviewListItem,
  QuizAssignmentData,
} from "@/lib/types/interview";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Maps interview with relations to AssignedInterview type
 * Used across data layer for consistent interview representation
 */
export const mapAssignedInterview = (interview: {
  id: string;
  token: string;
  status: string;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  candidate: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  quiz: {
    id: string;
    title: string;
  } | null;
}): AssignedInterview => ({
  id: interview.id,
  token: interview.token,
  status: interview.status,
  createdAt: interview.createdAt.toISOString(),
  startedAt: interview.startedAt?.toISOString() ?? null,
  completedAt: interview.completedAt?.toISOString() ?? null,
  candidateId: interview.candidate?.id ?? "",
  candidateName: interview.candidate?.name ?? "",
  candidateEmail: interview.candidate?.email ?? "",
  quizId: interview.quiz?.id ?? "",
  quizTitle: interview.quiz?.title ?? "",
});

/**
 * Maps interview record to InterviewListItem type
 * Used in interviews listing to include position information
 */
export const mapInterviewListItem = (record: {
  id: string;
  token: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  score: number | null;
  candidateId: string;
  candidate: {
    name: string | null;
    email: string | null;
  } | null;
  quizId: string;
  quiz: {
    title: string;
    positionId: string;
    position: {
      id: string;
      title: string;
      skills: string[];
    } | null;
  } | null;
}): InterviewListItem => {
  return {
    id: record.id,
    token: record.token,
    status: record.status,
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    score: record.score ?? null,
    candidateId: record.candidateId,
    candidateName: record.candidate?.name ?? "",
    candidateEmail: record.candidate?.email ?? "",
    quizId: record.quizId,
    quizTitle: record.quiz?.title ?? "",
    positionId: record.quiz?.position?.id ?? null,
    positionTitle: record.quiz?.position?.title ?? null,
    positionSkills: record.quiz?.position?.skills ?? [],
  };
};

const getQuizAssignmentDataCached = async (
  quizId: string,
  userId: string
): Promise<QuizAssignmentData | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag("interviews");

  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      createdBy: userId,
    },
    include: {
      position: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!quiz) {
    return null;
  }

  const interviews = await prisma.interview.findMany({
    where: {
      quizId: quiz.id,
    },
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const assignedInterviews = interviews.map(mapAssignedInterview);
  const assignedCandidateIds = assignedInterviews
    .map((interview) => interview.candidateId)
    .filter(Boolean);

  const unassignedCandidates = await prisma.candidate.findMany({
    where: {
      positionId: quiz.positionId,
      createdBy: userId,
      id: {
        notIn: assignedCandidateIds,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return {
    quiz: {
      id: quiz.id,
      title: quiz.title,
      positionId: quiz.positionId,
      timeLimit: quiz.timeLimit,
      createdBy: quiz.createdBy,
    },
    position: quiz.position
      ? {
          id: quiz.position.id,
          title: quiz.position.title,
        }
      : null,
    assignedInterviews,
    unassignedCandidates,
  };
};

export const getQuizAssignmentData = async (
  quizId: string
): Promise<QuizAssignmentData | null> => {
  const user = await requireUser();
  return getQuizAssignmentDataCached(quizId, user.id);
};

const getCandidateQuizDataCached = async (
  candidateId: string,
  userId: string
): Promise<CandidateQuizData | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag("interviews");

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      createdBy: userId,
    },
    include: {
      position: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!candidate) {
    return null;
  }

  const interviews = await prisma.interview.findMany({
    where: {
      candidateId: candidate.id,
    },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          timeLimit: true,
          positionId: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const assignedInterviews = interviews.map((interview) => ({
    id: interview.id,
    token: interview.token,
    status: interview.status,
    createdAt: interview.createdAt.toISOString(),
    startedAt: interview.startedAt?.toISOString() ?? null,
    completedAt: interview.completedAt?.toISOString() ?? null,
    candidateId: interview.candidateId,
    candidateName: candidate.name,
    candidateEmail: candidate.email,
    quizId: interview.quiz?.id ?? "",
    quizTitle: interview.quiz?.title ?? "",
  }));

  const assignedQuizIds = assignedInterviews
    .map((interview) => interview.quizId)
    .filter(Boolean);

  const availableQuizzes = await prisma.quiz.findMany({
    where: {
      positionId: candidate.positionId,
      createdBy: userId,
      id: {
        notIn: assignedQuizIds,
      },
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      timeLimit: true,
      positionId: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    candidate: {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      status: candidate.status,
      positionId: candidate.positionId,
    },
    position: candidate.position
      ? {
          id: candidate.position.id,
          title: candidate.position.title,
        }
      : null,
    availableQuizzes: availableQuizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      createdAt: quiz.createdAt.toISOString(),
      timeLimit: quiz.timeLimit,
      positionId: quiz.positionId,
    })),
    assignedInterviews,
  };
};

export const getCandidateQuizData = async (
  candidateId: string
): Promise<CandidateQuizData | null> => {
  const user = await requireUser();
  return getCandidateQuizDataCached(candidateId, user.id);
};

type InterviewAnswer = string | { code: string } | null;

export type InterviewByTokenResult = {
  interview: {
    token: string;
    status: "pending" | "in_progress" | "completed";
    answers: Record<string, InterviewAnswer> | null;
  };
  quiz: Quiz;
  candidate: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export const getInterviewByToken = async (
  token: string
): Promise<InterviewByTokenResult | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag("interviews");

  const interview = await prisma.interview.findUnique({
    where: { token },
    include: {
      quiz: {
        include: {
          position: {
            select: {
              id: true,
              title: true,
              experienceLevel: true,
              description: true,
              skills: true,
            },
          },
        },
      },
      candidate: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!interview || !interview.quiz || !interview.candidate) {
    return null;
  }

  // Use consolidated mapping from quizzes data layer
  const quiz = mapQuizFromPrismaDetails(interview.quiz);

  const interviewAnswers =
    (interview.answers as Record<string, InterviewAnswer> | null) ?? null;

  const status =
    interview.status === "pending" ||
    interview.status === "in_progress" ||
    interview.status === "completed"
      ? interview.status
      : "pending";

  return {
    interview: {
      token: interview.token,
      status,
      answers: interviewAnswers,
    },
    quiz,
    candidate: {
      id: interview.candidate.id,
      name: interview.candidate.name,
      email: interview.candidate.email,
    },
  };
};

export type InterviewDetailResult = {
  interview: {
    id: string;
    token: string;
    status: "pending" | "in_progress" | "completed";
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    score: number | null;
    answers: Record<string, InterviewAnswer> | null;
  };
  quiz: Quiz;
  candidate: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export const getInterviewDetail = async (
  id: string,
  userId: string
): Promise<InterviewDetailResult | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag("interviews");

  const interview = await prisma.interview.findFirst({
    where: {
      id,
      quiz: {
        createdBy: userId,
      },
      candidate: {
        createdBy: userId,
      },
    },
    include: {
      quiz: {
        include: {
          position: {
            select: {
              id: true,
              title: true,
              experienceLevel: true,
              description: true,
              skills: true,
            },
          },
        },
      },
      candidate: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!interview || !interview.quiz || !interview.candidate) {
    return null;
  }

  // Use consolidated mapping from quizzes data layer
  const quiz = mapQuizFromPrismaDetails(interview.quiz);

  const answers =
    (interview.answers as Record<string, InterviewAnswer> | null) ?? null;

  const detailStatus =
    interview.status === "pending" ||
    interview.status === "in_progress" ||
    interview.status === "completed"
      ? interview.status
      : "pending";

  return {
    interview: {
      id: interview.id,
      token: interview.token,
      status: detailStatus,
      startedAt: interview.startedAt ? interview.startedAt.toISOString() : null,
      completedAt: interview.completedAt
        ? interview.completedAt.toISOString()
        : null,
      createdAt: interview.createdAt.toISOString(),
      score: interview.score ?? null,
      answers,
    },
    quiz,
    candidate: {
      id: interview.candidate.id,
      name: interview.candidate.name,
      email: interview.candidate.email,
    },
  };
};

export const getCompletedInterviewsCount = async () => {
  "use cache";
  cacheLife("hours");
  cacheTag("interviews");

  return prisma.interview.count({
    where: {
      status: "completed",
    },
  });
};

/**
 * Fetches all interviews for a specific quiz
 * Returns mapped AssignedInterview objects
 */
export const getInterviewsByQuiz = async (
  quizId: string
): Promise<AssignedInterview[]> => {
  "use cache";
  cacheLife("hours");
  cacheTag("interviews");

  const interviews = await prisma.interview.findMany({
    where: { quizId },
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return interviews.map(mapAssignedInterview);
};

/**
 * Fetches filtered and paginated interviews list
 * Used in interviews dashboard
 */
export async function getFilteredInterviews(filters: {
  search?: string;
  status?: string;
  positionId?: string;
  programmingLanguage?: string;
  page?: number;
  limit?: number;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag("interviews");

  const {
    search = "",
    status = "all",
    positionId = "all",
    programmingLanguage = "all",
    page = 1,
    limit = 10,
  } = filters;

  const normalizedPage = Math.max(page ?? 1, 1);
  const normalizedLimit = Math.max(limit ?? 10, 1);
  const searchTerm = search.trim();

  const whereClauses: Prisma.InterviewWhereInput[] = [
    {
      candidate: {},
    },
  ];

  if (status !== "all") {
    whereClauses.push({ status });
  }

  if (positionId !== "all") {
    whereClauses.push({ quiz: { positionId } });
  }

  if (programmingLanguage !== "all") {
    whereClauses.push({
      quiz: {
        position: {
          skills: {
            has: programmingLanguage,
          },
        },
      },
    });
  }

  if (searchTerm) {
    const searchFilter: Prisma.InterviewWhereInput = {
      OR: [
        {
          candidate: {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          candidate: {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          quiz: {
            title: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          quiz: {
            position: {
              title: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    };

    whereClauses.push(searchFilter);
  }

  const where: Prisma.InterviewWhereInput = whereClauses.length
    ? { AND: whereClauses }
    : {};

  const interviewRecords = await prisma.interview.findMany({
    where,
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      quiz: {
        select: {
          id: true,
          title: true,
          positionId: true,
          position: {
            select: {
              id: true,
              title: true,
              skills: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (normalizedPage - 1) * normalizedLimit,
    take: normalizedLimit,
  });

  const interviews = interviewRecords.map(mapInterviewListItem);

  const statusCounts = interviews.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const totalCount = await prisma.interview.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / normalizedLimit));

  const positions = await prisma.position.findMany({
    select: {
      id: true,
      title: true,
      skills: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  const programmingLanguages = Array.from(
    new Set(positions.flatMap((position) => position.skills ?? []))
  ).sort((a, b) => a.localeCompare(b));

  return {
    interviews,
    positions,
    programmingLanguages,
    statusCounts,
    totalCount,
    currentPage: normalizedPage,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPrevPage: normalizedPage > 1,
  };
}
