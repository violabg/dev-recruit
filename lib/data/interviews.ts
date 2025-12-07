import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { mapQuizFromPrisma, Quiz } from "@/lib/data/quizzes";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { CacheTags } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { InterviewStatus } from "../schemas";

// Include pattern for quiz with linked questions + extended position details for interviews
const QUIZ_INCLUDE_FOR_INTERVIEWS = {
  position: {
    select: {
      id: true,
      title: true,
      experienceLevel: true,
      description: true,
      skills: true,
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

// ============================================================================
// Prisma GetPayload Types - derived from actual query includes
// ============================================================================

type InterviewWithCandidateAndQuiz = Prisma.InterviewGetPayload<{
  include: {
    candidate: {
      select: { id: true; firstName: true; lastName: true; email: true };
    };
    quiz: {
      select: { id: true; title: true };
    };
  };
}>;

type InterviewWithFullRelations = Prisma.InterviewGetPayload<{
  include: {
    candidate: {
      select: { id: true; firstName: true; lastName: true; email: true };
    };
    quiz: {
      select: {
        id: true;
        title: true;
        positionId: true;
        timeLimit: true;
        position: {
          select: { id: true; title: true; skills: true };
        };
      };
    };
  };
}>;

// ============================================================================
// API Response DTOs - serialized types for client consumption
// These transform Prisma Date objects to ISO strings for JSON serialization
// ============================================================================

/**
 * Interview list item DTO for interviews table/grid views
 * Includes flattened position data for display
 */
export type InterviewListItem = {
  id: string;
  token: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  score: number | null;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  quizId: string;
  quizTitle: string;
  quizTimeLimit: number;
  positionId: string | null;
  positionTitle: string | null;
  positionSkills: string[];
};

/**
 * Assigned interview DTO for quiz assignment views
 * Lightweight version with candidate and quiz info
 */
export type AssignedInterview = {
  id: string;
  token: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  quizId: string;
  quizTitle: string;
};

/**
 * Unassigned candidate DTO for assignment forms
 */
export type UnassignedCandidate = {
  id: string;
  name: string;
  email: string;
  status: string;
};

/**
 * Quiz assignment data DTO - composite type for quiz invite page
 */
export type QuizAssignmentData = {
  quiz: {
    id: string;
    title: string;
    positionId: string;
    timeLimit: number | null;
    createdBy: string;
  };
  position: {
    id: string;
    title: string;
  } | null;
  assignedInterviews: AssignedInterview[];
  unassignedCandidates: UnassignedCandidate[];
};

/**
 * Candidate quiz data DTO - composite type for candidate quiz assignment
 */
export type CandidateQuizData = {
  candidate: {
    id: string;
    name: string;
    email: string;
    status: string;
    positionId: string;
  };
  position: {
    id: string;
    title: string;
  } | null;
  availableQuizzes: Array<{
    id: string;
    title: string;
    createdAt: string;
    timeLimit: number | null;
    positionId: string;
  }>;
  assignedInterviews: AssignedInterview[];
};

// ============================================================================
// Mapper Functions - transform Prisma results to DTOs
// ============================================================================

/**
 * Helper to get full name from firstName and lastName
 */
function getFullName(
  firstName: string | null,
  lastName: string | null
): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.join(" ") || "";
}

/**
 * Maps interview with relations to AssignedInterview DTO
 * Used across data layer for consistent interview representation
 */
export const mapAssignedInterview = (
  interview: InterviewWithCandidateAndQuiz
): AssignedInterview => ({
  id: interview.id,
  token: interview.token,
  status: interview.status,
  createdAt: interview.createdAt.toISOString(),
  startedAt: interview.startedAt?.toISOString() ?? null,
  completedAt: interview.completedAt?.toISOString() ?? null,
  candidateId: interview.candidate?.id ?? "",
  candidateName: getFullName(
    interview.candidate?.firstName ?? null,
    interview.candidate?.lastName ?? null
  ),
  candidateEmail: interview.candidate?.email ?? "",
  quizId: interview.quiz?.id ?? "",
  quizTitle: interview.quiz?.title ?? "",
});

/**
 * Maps interview record to InterviewListItem DTO
 * Used in interviews listing to include position information
 */
export const mapInterviewListItem = (
  record: InterviewWithFullRelations
): InterviewListItem => {
  return {
    id: record.id,
    token: record.token,
    status: record.status,
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    score: record.score ?? null,
    candidateId: record.candidateId,
    candidateName: getFullName(
      record.candidate?.firstName ?? null,
      record.candidate?.lastName ?? null
    ),
    candidateEmail: record.candidate?.email ?? "",
    quizId: record.quizId,
    quizTitle: record.quiz?.title ?? "",
    quizTimeLimit: record.quiz?.timeLimit ?? 0,
    positionId: record.quiz?.position?.id ?? null,
    positionTitle: record.quiz?.position?.title ?? null,
    positionSkills: record.quiz?.position?.skills ?? [],
  };
};

async function getQuizAssignmentDataCached(
  quizId: string
): Promise<QuizAssignmentData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.INTERVIEWS);

  const quiz = await prisma.quiz.findUnique({
    where: {
      id: quizId,
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
          firstName: true,
          lastName: true,
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
      id: {
        notIn: assignedCandidateIds,
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
    },
    orderBy: {
      lastName: "asc",
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
    unassignedCandidates: unassignedCandidates.map((c) => ({
      id: c.id,
      name: getFullName(c.firstName, c.lastName),
      email: c.email,
      status: c.status,
    })),
  };
}

export const getQuizAssignmentData = async (
  quizId: string
): Promise<QuizAssignmentData | null> => {
  return getQuizAssignmentDataCached(quizId);
};

async function getCandidateQuizDataCached(
  candidateId: string
): Promise<CandidateQuizData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.INTERVIEWS);

  const candidate = await prisma.candidate.findUnique({
    where: {
      id: candidateId,
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
    candidateName: getFullName(candidate.firstName, candidate.lastName),
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
      name: getFullName(candidate.firstName, candidate.lastName),
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
}

export const getCandidateQuizData = async (
  candidateId: string
): Promise<CandidateQuizData | null> => {
  return getCandidateQuizDataCached(candidateId);
};

type InterviewAnswer = string | { code: string } | null;

export type InterviewByTokenResult = {
  interview: {
    token: string;
    status: InterviewStatus;
    answers: Record<string, InterviewAnswer> | null;
    startedAt: string | null;
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
  // No caching for interview by token - data changes frequently during active interviews
  // (startedAt, answers, completedAt, status all change during the interview)

  const interview = await prisma.interview.findUnique({
    where: { token },
    include: {
      quiz: {
        include: QUIZ_INCLUDE_FOR_INTERVIEWS,
      },
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!interview || !interview.quiz || !interview.candidate) {
    return null;
  }

  // Use consolidated mapping from quizzes data layer
  const quiz = mapQuizFromPrisma(interview.quiz);

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
      startedAt: interview.startedAt?.toISOString() ?? null,
    },
    quiz,
    candidate: {
      id: interview.candidate.id,
      name: getFullName(
        interview.candidate.firstName,
        interview.candidate.lastName
      ),
      email: interview.candidate.email,
    },
  };
};

export type InterviewDetailResult = {
  interview: {
    id: string;
    token: string;
    status: InterviewStatus;
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
  id: string
): Promise<InterviewDetailResult | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.INTERVIEWS);

  const interview = await prisma.interview.findFirst({
    where: {
      id,
    },
    include: {
      quiz: {
        include: QUIZ_INCLUDE_FOR_INTERVIEWS,
      },
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!interview || !interview.quiz || !interview.candidate) {
    return null;
  }

  // Use consolidated mapping from quizzes data layer
  const quiz = mapQuizFromPrisma(interview.quiz);

  const answers =
    (interview.answers as Record<string, InterviewAnswer> | null) ?? null;

  return {
    interview: {
      id: interview.id,
      token: interview.token,
      status: interview.status,
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
      name: getFullName(
        interview.candidate.firstName,
        interview.candidate.lastName
      ),
      email: interview.candidate.email,
    },
  };
};

export const getCompletedInterviewsCount = async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.INTERVIEWS);

  return prisma.interview.count({
    where: {
      status: "completed",
    },
  });
};

// TODO see if we can remove it
/**
 * Fetches all interviews for a specific quiz
 * Returns mapped AssignedInterview objects
 */
export const getInterviewsByQuiz = async (
  quizId: string
): Promise<AssignedInterview[]> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.INTERVIEWS);

  const interviews = await prisma.interview.findMany({
    where: { quizId },
    include: {
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
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
/**
 * Returns last N interview IDs for generateStaticParams.
 * Used to pre-render most recent interview detail pages at build time.
 */
export const getRecentInterviewIds = async (limit = 100): Promise<string[]> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.INTERVIEWS);

  const interviews = await prisma.interview.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });

  return interviews.map((i) => i.id);
};

export const getFilteredInterviews = cache(
  async (filters: {
    search?: string;
    status?: InterviewStatus | "all";
    positionId?: string;
    programmingLanguage?: string;
    page?: number;
    pageSize?: number;
  }) => {
    "use cache";
    cacheLife("hours");
    cacheTag(CacheTags.INTERVIEWS);

    const {
      search = "",
      status = "all",
      positionId = "all",
      programmingLanguage = "all",
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
    } = filters;

    // Avoid Math.max() which calls .valueOf() and fails with temporary client references
    const normalizedPage = typeof page === "number" && page > 0 ? page : 1;
    const normalizedPageSize =
      typeof pageSize === "number" && pageSize > 0
        ? pageSize
        : DEFAULT_PAGE_SIZE;
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
              firstName: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
          {
            candidate: {
              lastName: {
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
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        quiz: {
          select: {
            id: true,
            title: true,
            positionId: true,
            timeLimit: true,
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
      skip: (normalizedPage - 1) * normalizedPageSize,
      take: normalizedPageSize,
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
    const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));

    return {
      interviews,
      statusCounts,
      totalCount,
      currentPage: normalizedPage,
      totalPages,
      hasNextPage: normalizedPage < totalPages,
      hasPrevPage: normalizedPage > 1,
    };
  }
);
