import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { mapQuizFromPrisma, Quiz } from "@/lib/data/quizzes";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import type { ApplicationStage, AssessmentStatus } from "../schemas";

/** Applications that can still receive a test */
const CLOSED_APPLICATION_STAGES: ApplicationStage[] = ["rejected", "withdrawn"];

// Include pattern for quiz with linked questions + extended position details for assessments
const QUIZ_INCLUDE_FOR_ASSESSMENTS = {
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

type AssessmentWithCandidateAndQuiz = Prisma.AssessmentGetPayload<{
  include: {
    candidate: {
      select: { id: true; firstName: true; lastName: true; email: true };
    };
    quiz: {
      select: { id: true; title: true; timeLimit: true };
    };
  };
}>;

type AssessmentWithFullRelations = Prisma.AssessmentGetPayload<{
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
 * Assessment list item DTO for assessments table/grid views
 * Includes flattened position data for display
 */
export type AssessmentListItem = {
  id: string;
  token: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  applicationId: string;
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
 * Assigned assessment DTO for quiz assignment views
 * Lightweight version with candidate and quiz info
 */
export type AssignedAssessment = {
  id: string;
  token: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  quizId: string;
  quizTitle: string;
  quizTimeLimit: number | null;
};

/**
 * Unassigned candidate DTO for assignment forms
 */
export type UnassignedCandidate = {
  id: string;
  name: string;
  email: string;
  /** Stage of the candidate's application for the quiz position */
  stage: ApplicationStage;
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
  assignedAssessments: AssignedAssessment[];
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
  };
  /** Applications that can still receive a test (not rejected, not withdrawn) */
  applications: {
    id: string;
    positionId: string;
    positionTitle: string;
    stage: ApplicationStage;
  }[];
  availableQuizzes: Array<{
    id: string;
    title: string;
    createdAt: string;
    timeLimit: number | null;
    positionId: string;
    positionTitle: string;
  }>;
  assignedAssessments: AssignedAssessment[];
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
 * Maps assessment with relations to AssignedAssessment DTO
 * Used across data layer for consistent assessment representation
 */
export const mapAssignedAssessment = (
  assessment: AssessmentWithCandidateAndQuiz
): AssignedAssessment => ({
  id: assessment.id,
  token: assessment.token,
  status: assessment.status,
  createdAt: assessment.createdAt.toISOString(),
  startedAt: assessment.startedAt?.toISOString() ?? null,
  completedAt: assessment.completedAt?.toISOString() ?? null,
  applicationId: assessment.applicationId,
  candidateId: assessment.candidate?.id ?? "",
  candidateName: getFullName(
    assessment.candidate?.firstName ?? null,
    assessment.candidate?.lastName ?? null
  ),
  candidateEmail: assessment.candidate?.email ?? "",
  quizId: assessment.quiz?.id ?? "",
  quizTitle: assessment.quiz?.title ?? "",
  quizTimeLimit: assessment.quiz?.timeLimit ?? null,
});

/**
 * Maps assessment record to AssessmentListItem DTO
 * Used in assessments listing to include position information
 */
export const mapAssessmentListItem = (
  record: AssessmentWithFullRelations
): AssessmentListItem => {
  return {
    id: record.id,
    token: record.token,
    status: record.status,
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    applicationId: record.applicationId,
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

export const getQuizAssignmentData = async (
  quizId: string
): Promise<QuizAssignmentData | null> => {
  "use cache";
  cacheLife("hours");
  // Reads quiz + position, candidates eligible for the position, assessments
  cacheTag(
    CacheTags.ASSESSMENTS,
    CacheTags.QUIZZES,
    CacheTags.POSITIONS,
    CacheTags.CANDIDATES,
    entityTag.quiz(quizId),
  );

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

  const assessments = await prisma.assessment.findMany({
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
          timeLimit: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const assignedAssessments = assessments.map(mapAssignedAssessment);
  const assignedCandidateIds = assignedAssessments
    .map((assessment) => assessment.candidateId)
    .filter(Boolean);

  // Candidates whose application for the quiz position can still receive a
  // test and who have no assessment for this quiz
  const unassignedApplications = await prisma.application.findMany({
    where: {
      positionId: quiz.positionId,
      stage: { notIn: CLOSED_APPLICATION_STAGES },
      candidateId: {
        notIn: assignedCandidateIds,
      },
    },
    select: {
      stage: true,
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      candidate: { lastName: "asc" },
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
    assignedAssessments,
    unassignedCandidates: unassignedApplications.map(
      ({ stage, candidate }) => ({
        id: candidate.id,
        name: getFullName(candidate.firstName, candidate.lastName),
        email: candidate.email,
        stage,
      }),
    ),
  };
};

export const getCandidateQuizData = async (
  candidateId: string
): Promise<CandidateQuizData | null> => {
  "use cache";
  cacheLife("hours");
  // Reads candidate + applications, their assessments, and available quizzes
  cacheTag(
    CacheTags.ASSESSMENTS,
    CacheTags.CANDIDATES,
    CacheTags.POSITIONS,
    CacheTags.QUIZZES,
    entityTag.candidate(candidateId),
  );

  const candidate = await prisma.candidate.findUnique({
    where: {
      id: candidateId,
    },
    include: {
      applications: {
        where: {
          stage: { notIn: CLOSED_APPLICATION_STAGES },
        },
        include: {
          position: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        // Recent activity first: no application is primary
        orderBy: {
          stageChangedAt: "desc",
        },
      },
    },
  });

  if (!candidate) {
    return null;
  }

  const assessments = await prisma.assessment.findMany({
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

  const assignedAssessments = assessments.map((assessment) => ({
    id: assessment.id,
    token: assessment.token,
    status: assessment.status,
    createdAt: assessment.createdAt.toISOString(),
    startedAt: assessment.startedAt?.toISOString() ?? null,
    completedAt: assessment.completedAt?.toISOString() ?? null,
    applicationId: assessment.applicationId,
    candidateId: assessment.candidateId,
    candidateName: getFullName(candidate.firstName, candidate.lastName),
    candidateEmail: candidate.email,
    quizId: assessment.quiz?.id ?? "",
    quizTitle: assessment.quiz?.title ?? "",
    quizTimeLimit: assessment.quiz?.timeLimit ?? null,
  }));

  const assignedQuizIds = assignedAssessments
    .map((assessment) => assessment.quizId)
    .filter(Boolean);

  // Quizzes of the positions of every application that can still receive one
  const positionIds = candidate.applications.map(
    (application) => application.position.id,
  );

  const availableQuizzes = await prisma.quiz.findMany({
    where: {
      positionId: {
        in: positionIds,
      },
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
      position: { select: { title: true } },
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
    },
    applications: candidate.applications.map((application) => ({
      id: application.id,
      positionId: application.position.id,
      positionTitle: application.position.title,
      stage: application.stage,
    })),
    availableQuizzes: availableQuizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      createdAt: quiz.createdAt.toISOString(),
      timeLimit: quiz.timeLimit,
      positionId: quiz.positionId,
      positionTitle: quiz.position.title,
    })),
    assignedAssessments,
  };
};

type StoredAnswer = string | { code: string } | null;

export type AssessmentByTokenResult = {
  assessment: {
    token: string;
    status: AssessmentStatus;
    answers: Record<string, StoredAnswer> | null;
    startedAt: string | null;
  };
  quiz: Quiz;
  candidate: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export const getAssessmentByToken = async (
  token: string
): Promise<AssessmentByTokenResult | null> => {
  // No caching for assessment by token - data changes frequently during active assessments
  // (startedAt, answers, completedAt, status all change during the assessment)

  const assessment = await prisma.assessment.findUnique({
    where: { token },
    include: {
      quiz: {
        include: QUIZ_INCLUDE_FOR_ASSESSMENTS,
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

  if (!assessment || !assessment.quiz || !assessment.candidate) {
    return null;
  }

  // Use consolidated mapping from quizzes data layer
  const quiz = mapQuizFromPrisma(assessment.quiz);

  const assessmentAnswers =
    (assessment.answers as Record<string, StoredAnswer> | null) ?? null;

  const status =
    assessment.status === "pending" ||
    assessment.status === "in_progress" ||
    assessment.status === "completed"
      ? assessment.status
      : "pending";

  return {
    assessment: {
      token: assessment.token,
      status,
      answers: assessmentAnswers,
      startedAt: assessment.startedAt?.toISOString() ?? null,
    },
    quiz,
    candidate: {
      id: assessment.candidate.id,
      name: getFullName(
        assessment.candidate.firstName,
        assessment.candidate.lastName
      ),
      email: assessment.candidate.email,
    },
  };
};

export type AssessmentDetailResult = {
  assessment: {
    id: string;
    token: string;
    status: AssessmentStatus;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    answers: Record<string, StoredAnswer> | null;
  };
  quiz: Quiz;
  candidate: {
    id: string;
    name: string | null;
    email: string | null;
  };
  /** The application the test belongs to */
  applicationId: string;
};

export const getAssessmentDetail = async (
  id: string
): Promise<AssessmentDetailResult | null> => {
  "use cache";
  cacheLife("hours");
  // Embeds the full quiz (with questions) and candidate
  cacheTag(
    CacheTags.ASSESSMENTS,
    CacheTags.QUIZZES,
    CacheTags.QUESTIONS,
    CacheTags.CANDIDATES,
    CacheTags.POSITIONS,
    entityTag.assessment(id),
  );

  const assessment = await prisma.assessment.findFirst({
    where: {
      id,
    },
    include: {
      quiz: {
        include: QUIZ_INCLUDE_FOR_ASSESSMENTS,
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

  if (!assessment || !assessment.quiz || !assessment.candidate) {
    return null;
  }

  // Use consolidated mapping from quizzes data layer
  const quiz = mapQuizFromPrisma(assessment.quiz);

  const answers =
    (assessment.answers as Record<string, StoredAnswer> | null) ?? null;

  return {
    assessment: {
      id: assessment.id,
      token: assessment.token,
      status: assessment.status,
      startedAt: assessment.startedAt
        ? assessment.startedAt.toISOString()
        : null,
      completedAt: assessment.completedAt
        ? assessment.completedAt.toISOString()
        : null,
      createdAt: assessment.createdAt.toISOString(),
      answers,
    },
    quiz,
    candidate: {
      id: assessment.candidate.id,
      name: getFullName(
        assessment.candidate.firstName,
        assessment.candidate.lastName
      ),
      email: assessment.candidate.email,
    },
    applicationId: assessment.applicationId,
  };
};

export const getCompletedAssessmentsCount = async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.ASSESSMENTS);

  return prisma.assessment.count({
    where: {
      status: "completed",
    },
  });
};

// TODO see if we can remove it
/**
 * Fetches all assessments for a specific quiz
 * Returns mapped AssignedAssessment objects
 */
export const getAssessmentsByQuiz = async (
  quizId: string
): Promise<AssignedAssessment[]> => {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.ASSESSMENTS,
    CacheTags.CANDIDATES,
    CacheTags.QUIZZES,
  );

  const assessments = await prisma.assessment.findMany({
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
          timeLimit: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return assessments.map(mapAssignedAssessment);
};

/**
 * Returns last N assessment IDs for generateStaticParams.
 * Used to pre-render most recent assessment detail pages at build time.
 */
export const getRecentAssessmentIds = async (
  limit = 100
): Promise<string[]> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.ASSESSMENTS);

  const assessments = await prisma.assessment.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });

  return assessments.map((a) => a.id);
};

/**
 * Fetches filtered and paginated assessments list
 * Used in assessments dashboard
 */
export const getFilteredAssessments = cache(
  async (filters: {
    search?: string;
    status?: AssessmentStatus | "all";
    positionId?: string;
    programmingLanguage?: string;
    page?: number;
    pageSize?: number;
  }) => {
    "use cache";
    cacheLife("hours");
    // Joins candidate, quiz and position for display and filtering
  cacheTag(
    CacheTags.ASSESSMENTS,
    CacheTags.CANDIDATES,
    CacheTags.QUIZZES,
    CacheTags.POSITIONS,
  );

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

    const whereClauses: Prisma.AssessmentWhereInput[] = [
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
      const searchFilter: Prisma.AssessmentWhereInput = {
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

    const where: Prisma.AssessmentWhereInput = whereClauses.length
      ? { AND: whereClauses }
      : {};

    const assessmentRecords = await prisma.assessment.findMany({
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

    const assessments = assessmentRecords.map(mapAssessmentListItem);

    const totalCount = await prisma.assessment.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));

    return {
      assessments,
      totalCount,
      currentPage: normalizedPage,
      totalPages,
      hasNextPage: normalizedPage < totalPages,
      hasPrevPage: normalizedPage > 1,
    };
  }
);

/**
 * Computes counts of assessments grouped by status
 */
export const getAssessmentsStatus = cache(
  async (): Promise<Record<string, number>> => {
    "use cache";
    cacheLife("hours");
    cacheTag(CacheTags.ASSESSMENTS);
    const assessments = await prisma.assessment.findMany({
      select: {
        status: true,
      },
    });

    const statusCounts = assessments.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      },
      {}
    );
    return statusCounts;
  }
);
