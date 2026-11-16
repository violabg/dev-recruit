import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import type {
  ApplicationStage,
  AssessmentStatus,
  PositionStatus,
} from "@/lib/schemas";
import { OPEN_STAGES } from "@/lib/utils/application-stage";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Applications data layer. An application has no cache tag of its own: its
 * reads are tagged with the candidate and position collections (and the
 * collections they join), and every application write calls
 * invalidateCandidateCache. No function reads the session, filters by user
 * or reads the clock.
 */

/** Applications that can no longer receive a test or an evaluation step */
const CLOSED_STAGES: ApplicationStage[] = ["rejected", "withdrawn"];

const ownerSelect = { select: { id: true, name: true } } as const;

export type ApplicationOwner = { id: string; name: string } | null;

export type ApplicationAssessment = {
  id: string;
  token: string;
  status: AssessmentStatus;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  quiz: { id: string; title: string; timeLimit: number | null };
  evaluation: {
    id: string;
    quizScore: number | null;
    fitScore: number | null;
    createdAt: Date;
  } | null;
};

export type ApplicationDetail = {
  id: string;
  stage: ApplicationStage;
  stageChangedAt: Date;
  createdAt: Date;
  owner: ApplicationOwner;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    resumeUrl: string | null;
    doNotContact: boolean;
    doNotContactNote: string | null;
  };
  position: {
    id: string;
    title: string;
    experienceLevel: string;
    status: PositionStatus;
  };
  assessments: ApplicationAssessment[];
  resumeEvaluation: {
    id: string;
    fitScore: number | null;
    evaluation: string | null;
    strengths: string[];
    weaknesses: string[];
    recommendation: string | null;
    createdAt: Date;
  } | null;
  availableQuizzes: {
    id: string;
    title: string;
    timeLimit: number | null;
    createdAt: Date;
  }[];
};

export type ApplicationEvaluationSummary = {
  applicationId: string;
  candidateId: string;
  positionId: string;
  assessmentEvaluation: {
    id: string;
    assessmentId: string;
    quizTitle: string;
    quizScore: number | null;
    fitScore: number | null;
    interviewNotes: string | null;
    redFlags: string[];
    standoutMoments: string[];
    hireRecommendation: string | null;
    nextSteps: string | null;
  } | null;
  rubric: {
    communicationScore: number;
    collaborationScore: number;
    problemSolvingScore: number;
    cultureFitScore: number;
    leadershipScore: number | null;
    strengthExamples: string[];
    improvementAreas: string[];
    overallComments: string | null;
  } | null;
};

export type ApplicationCard = {
  id: string;
  stage: ApplicationStage;
  stageChangedAt: Date;
  owner: ApplicationOwner;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    doNotContact: boolean;
  };
  assessmentCount: number;
};

export type ApplicationListItem = {
  id: string;
  stage: ApplicationStage;
  stageChangedAt: Date;
  owner: ApplicationOwner;
  candidate: { id: string; firstName: string; lastName: string; email: string };
  position: { id: string; title: string };
};

export type FetchApplicationsParams = {
  search?: string;
  stage?: ApplicationStage | "all";
  /** "all" or a position id */
  positionId?: string;
  /** Set by the page only when "Solo le mie" is on */
  ownerId?: string;
  page?: number;
  pageSize?: number;
};

export type PaginatedApplications = {
  applications: ApplicationListItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type ActionCenterData = {
  assessmentsToEvaluate: {
    assessmentId: string;
    applicationId: string;
    ownerId: string | null;
    candidateName: string;
    positionTitle: string;
    quizTitle: string;
    completedAt: Date | null;
  }[];
  openApplications: {
    applicationId: string;
    ownerId: string | null;
    candidateName: string;
    positionTitle: string;
    stage: ApplicationStage;
    stageChangedAt: Date;
  }[];
  positionsWithIncompleteSetup: {
    positionId: string;
    title: string;
    status: PositionStatus;
    missing: "quiz"[];
  }[];
  /** Phase 3: always [] in Phase 1 */
  interviewsWithoutKit: {
    applicationId: string;
    ownerId: string | null;
    candidateName: string;
    positionTitle: string;
    scheduledAt: Date;
  }[];
  /** Phase 3: always [] in Phase 1 */
  feedbackToFill: {
    applicationId: string;
    ownerId: string | null;
    candidateName: string;
    positionTitle: string;
  }[];
};

const fullName = (candidate: { firstName: string; lastName: string }) =>
  `${candidate.firstName} ${candidate.lastName}`.trim();

/** Everything the application page shows */
export async function getApplicationDetail(
  id: string,
): Promise<ApplicationDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.CANDIDATES,
    CacheTags.POSITIONS,
    CacheTags.ASSESSMENTS,
    CacheTags.EVALUATIONS,
    CacheTags.QUIZZES,
  );

  const application = await prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      stage: true,
      stageChangedAt: true,
      createdAt: true,
      candidateId: true,
      positionId: true,
      owner: ownerSelect,
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          resumeUrl: true,
          doNotContact: true,
          doNotContactNote: true,
        },
      },
      position: {
        select: {
          id: true,
          title: true,
          experienceLevel: true,
          status: true,
        },
      },
      assessments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          token: true,
          status: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
          quiz: { select: { id: true, title: true, timeLimit: true } },
          evaluation: {
            select: {
              id: true,
              quizScore: true,
              fitScore: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!application) {
    return null;
  }

  cacheTag(
    entityTag.candidate(application.candidateId),
    entityTag.position(application.positionId),
  );

  // The resume evaluation of an application: same candidate and position,
  // no assessment
  const resumeEvaluation = await prisma.evaluation.findFirst({
    where: {
      candidateId: application.candidateId,
      positionId: application.positionId,
      assessmentId: null,
    },
    select: {
      id: true,
      fitScore: true,
      evaluation: true,
      strengths: true,
      weaknesses: true,
      recommendation: true,
      createdAt: true,
    },
  });

  // Quizzes of the position not yet sent to this candidate, newest first
  const sentQuizzes = await prisma.assessment.findMany({
    where: { candidateId: application.candidateId },
    select: { quizId: true },
  });

  const availableQuizzes = await prisma.quiz.findMany({
    where: {
      positionId: application.positionId,
      id: { notIn: sentQuizzes.map((assessment) => assessment.quizId) },
    },
    select: { id: true, title: true, timeLimit: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    id: application.id,
    stage: application.stage,
    stageChangedAt: application.stageChangedAt,
    createdAt: application.createdAt,
    owner: application.owner,
    candidate: application.candidate,
    position: application.position,
    assessments: application.assessments,
    resumeEvaluation,
    availableQuizzes,
  };
}

/** Data of the Decisione tab: the evaluation dashboard of one application */
export async function getApplicationEvaluationSummary(
  applicationId: string,
): Promise<ApplicationEvaluationSummary | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.EVALUATIONS,
    CacheTags.ASSESSMENTS,
    CacheTags.CANDIDATES,
    CacheTags.POSITIONS,
    CacheTags.QUIZZES,
    CacheTags.BEHAVIORAL_RUBRICS,
  );

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, candidateId: true, positionId: true },
  });

  if (!application) {
    return null;
  }

  cacheTag(
    entityTag.behavioralRubric(
      application.candidateId,
      application.positionId,
    ),
  );

  // The most recent evaluation among the tests of THIS application
  const evaluation = await prisma.evaluation.findFirst({
    where: { assessment: { applicationId: application.id } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      assessmentId: true,
      quizScore: true,
      fitScore: true,
      interviewNotes: true,
      redFlags: true,
      standoutMoments: true,
      hireRecommendation: true,
      nextSteps: true,
      assessment: { select: { quiz: { select: { title: true } } } },
    },
  });

  const rubric = await prisma.behavioralRubric.findUnique({
    where: {
      candidateId_positionId: {
        candidateId: application.candidateId,
        positionId: application.positionId,
      },
    },
    select: {
      communicationScore: true,
      collaborationScore: true,
      problemSolvingScore: true,
      cultureFitScore: true,
      leadershipScore: true,
      strengthExamples: true,
      improvementAreas: true,
      overallComments: true,
    },
  });

  return {
    applicationId: application.id,
    candidateId: application.candidateId,
    positionId: application.positionId,
    assessmentEvaluation:
      evaluation && evaluation.assessmentId
        ? {
            id: evaluation.id,
            assessmentId: evaluation.assessmentId,
            quizTitle: evaluation.assessment?.quiz.title ?? "",
            quizScore: evaluation.quizScore,
            fitScore: evaluation.fitScore,
            interviewNotes: evaluation.interviewNotes,
            redFlags: evaluation.redFlags,
            standoutMoments: evaluation.standoutMoments,
            hireRecommendation: evaluation.hireRecommendation,
            nextSteps: evaluation.nextSteps,
          }
        : null,
    rubric,
  };
}

/** Every application of a position, for the kanban */
export async function getApplicationsByPosition(
  positionId: string,
): Promise<ApplicationCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.CANDIDATES,
    CacheTags.POSITIONS,
    CacheTags.ASSESSMENTS,
    entityTag.position(positionId),
  );

  const applications = await prisma.application.findMany({
    where: { positionId },
    orderBy: { stageChangedAt: "desc" },
    select: {
      id: true,
      stage: true,
      stageChangedAt: true,
      owner: ownerSelect,
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          doNotContact: true,
        },
      },
      _count: { select: { assessments: true } },
    },
  });

  return applications.map(({ _count, ...application }) => ({
    ...application,
    assessmentCount: _count.assessments,
  }));
}

/** Filtered, paginated list of applications */
export async function getFilteredApplications(
  params?: FetchApplicationsParams,
): Promise<PaginatedApplications> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.CANDIDATES, CacheTags.POSITIONS);

  const {
    search = "",
    stage = "all",
    positionId = "all",
    ownerId,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = params ?? {};

  const normalizedPage = typeof page === "number" && page > 0 ? page : 1;
  const normalizedPageSize =
    typeof pageSize === "number" && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const searchTerm = search.trim();

  const where: Prisma.ApplicationWhereInput = {};

  if (stage !== "all") {
    where.stage = stage;
  }

  if (positionId !== "all") {
    where.positionId = positionId;
  }

  // A view filter the user can switch off, never an access limit
  if (ownerId) {
    where.ownerId = ownerId;
  }

  if (searchTerm) {
    where.candidate = {
      OR: [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ],
    };
  }

  const [applications, totalCount] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { stageChangedAt: "desc" },
      skip: (normalizedPage - 1) * normalizedPageSize,
      take: normalizedPageSize,
      select: {
        id: true,
        stage: true,
        stageChangedAt: true,
        owner: ownerSelect,
        candidate: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        position: { select: { id: true, title: true } },
      },
    }),
    prisma.application.count({ where }),
  ]);

  const totalPages =
    totalCount > 0 ? Math.ceil(totalCount / normalizedPageSize) : 1;

  return {
    applications,
    totalCount,
    currentPage: normalizedPage,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPrevPage: normalizedPage > 1,
  };
}

/**
 * Data of the home "Le mie azioni". Short-lived. Staleness and the "mine"
 * filter are decided by the page, outside the cache.
 */
export async function getActionCenterData(): Promise<ActionCenterData> {
  "use cache";
  cacheLife("minutes");
  cacheTag(
    CacheTags.CANDIDATES,
    CacheTags.POSITIONS,
    CacheTags.ASSESSMENTS,
    CacheTags.EVALUATIONS,
    CacheTags.QUIZZES,
  );

  const [assessments, applications, positions] = await Promise.all([
    prisma.assessment.findMany({
      where: {
        status: "completed",
        evaluation: null,
        application: { stage: { notIn: CLOSED_STAGES } },
      },
      orderBy: { completedAt: "asc" },
      select: {
        id: true,
        completedAt: true,
        quiz: { select: { title: true } },
        application: {
          select: {
            id: true,
            ownerId: true,
            candidate: { select: { firstName: true, lastName: true } },
            position: { select: { title: true } },
          },
        },
      },
    }),
    prisma.application.findMany({
      where: { stage: { in: [...OPEN_STAGES] } },
      orderBy: { stageChangedAt: "asc" },
      select: {
        id: true,
        ownerId: true,
        stage: true,
        stageChangedAt: true,
        candidate: { select: { firstName: true, lastName: true } },
        position: { select: { title: true } },
      },
    }),
    prisma.position.findMany({
      where: { status: { in: ["draft", "open"] }, quizzes: { none: {} } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true },
    }),
  ]);

  return {
    assessmentsToEvaluate: assessments.map((assessment) => ({
      assessmentId: assessment.id,
      applicationId: assessment.application.id,
      ownerId: assessment.application.ownerId,
      candidateName: fullName(assessment.application.candidate),
      positionTitle: assessment.application.position.title,
      quizTitle: assessment.quiz.title,
      completedAt: assessment.completedAt,
    })),
    openApplications: applications.map((application) => ({
      applicationId: application.id,
      ownerId: application.ownerId,
      candidateName: fullName(application.candidate),
      positionTitle: application.position.title,
      stage: application.stage,
      stageChangedAt: application.stageChangedAt,
    })),
    positionsWithIncompleteSetup: positions.map((position) => ({
      positionId: position.id,
      title: position.title,
      status: position.status,
      missing: ["quiz"],
    })),
    interviewsWithoutKit: [],
    feedbackToFill: [],
  };
}

/** Ids of the most recent applications, for generateStaticParams */
export async function getRecentApplicationIds(limit = 100): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.CANDIDATES);

  const applications = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });

  return applications.map((application) => application.id);
}
