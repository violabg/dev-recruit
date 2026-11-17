import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import {
  criteriaAssessmentSchema,
  type ApplicationStage,
  type AssessmentStatus,
  type CriterionCategory,
  type CriterionPriority,
  type InterviewStatus,
  type KitStatus,
  type PositionStatus,
} from "@/lib/schemas";
import {
  loadApplicationDecision,
  type ApplicationDecision,
} from "@/lib/services/application-decisions";
import { OPEN_STAGES } from "@/lib/utils/application-stage";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import { getPositionSetup, type SetupPart } from "@/lib/utils/position-setup";
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

export type { ApplicationDecision } from "@/lib/services/application-decisions";

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

export type ResumeCriterionAssessment = {
  criterionId: string;
  name: string;
  category: CriterionCategory;
  priority: CriterionPriority;
  expectedLevel: number;
  archived: boolean;
  score: number | null;
  evidence: string;
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
    /**
     * Assessment per scorecard criterion, in the order of the criteria.
     * Null for evaluations without it; entries of deleted criteria are
     * dropped, archived criteria are kept and flagged.
     */
    criteriaAssessment: ResumeCriterionAssessment[] | null;
  } | null;
  availableQuizzes: {
    id: string;
    title: string;
    timeLimit: number | null;
    createdAt: Date;
  }[];
  /** Interviews of the application, by round: the facts of the next action */
  interviews: {
    id: string;
    round: number;
    status: InterviewStatus;
    scheduledAt: Date;
    startedAt: Date | null;
    endedAt: Date | null;
    kitStatus: KitStatus | null;
    participantIds: string[];
    submittedInterviewerIds: string[];
  }[];
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
    /** Parts not set up yet, in the order scorecard, quiz, guide */
    missing: SetupPart[];
  }[];
  /**
   * Every scheduled interview of an open application whose kit is not ready,
   * by date: the page keeps today and tomorrow (the cache reads no clock)
   */
  interviewsWithoutKit: {
    interviewId: string;
    applicationId: string;
    ownerId: string | null;
    participantIds: string[];
    candidateName: string;
    positionTitle: string;
    round: number;
    scheduledAt: Date;
  }[];
  /** One row per participant of a completed interview without a submitted scorecard */
  feedbackToFill: {
    interviewId: string;
    applicationId: string;
    ownerId: string | null;
    interviewerId: string;
    interviewerName: string;
    candidateName: string;
    positionTitle: string;
    round: number;
  }[];
};

const fullName = (candidate: { firstName: string; lastName: string }) =>
  `${candidate.firstName} ${candidate.lastName}`.trim();

/**
 * Resolve a stored CV assessment per criterion against the criteria of the
 * position scorecard (active and archived), in the order of the criteria.
 * Null when missing or invalid; entries of deleted criteria are dropped.
 */
async function resolveCriteriaAssessment(
  positionId: string,
  raw: Prisma.JsonValue | null,
): Promise<ResumeCriterionAssessment[] | null> {
  if (raw === null) return null;
  const parsed = criteriaAssessmentSchema.safeParse(raw);
  if (!parsed.success) return null;

  const criteria = await prisma.scorecardCriterion.findMany({
    where: { scorecard: { positionId } },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      priority: true,
      expectedLevel: true,
      archivedAt: true,
    },
  });

  return criteria.flatMap((criterion) => {
    const entry = parsed.data[criterion.id];
    if (!entry) return [];
    return [
      {
        criterionId: criterion.id,
        name: criterion.name,
        category: criterion.category,
        priority: criterion.priority,
        expectedLevel: criterion.expectedLevel,
        archived: criterion.archivedAt !== null,
        score: entry.score,
        evidence: entry.evidence,
      },
    ];
  });
}

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
    CacheTags.SCORECARDS,
    CacheTags.INTERVIEWS,
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
      // Interview facts only: never notes, feedback only once submitted
      interviews: {
        orderBy: { round: "asc" },
        select: {
          id: true,
          round: true,
          status: true,
          scheduledAt: true,
          startedAt: true,
          endedAt: true,
          kit: { select: { status: true } },
          participants: { select: { userId: true } },
          feedback: {
            where: { submittedAt: { not: null } },
            select: { interviewerId: true },
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
  const storedResumeEvaluation = await prisma.evaluation.findFirst({
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
      criteriaAssessment: true,
    },
  });

  let resumeEvaluation: ApplicationDetail["resumeEvaluation"] = null;
  if (storedResumeEvaluation) {
    const { criteriaAssessment: rawAssessment, ...evaluation } =
      storedResumeEvaluation;
    resumeEvaluation = {
      ...evaluation,
      criteriaAssessment: await resolveCriteriaAssessment(
        application.positionId,
        rawAssessment,
      ),
    };
  }

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
    interviews: application.interviews.map((interview) => ({
      id: interview.id,
      round: interview.round,
      status: interview.status,
      scheduledAt: interview.scheduledAt,
      startedAt: interview.startedAt,
      endedAt: interview.endedAt,
      kitStatus: interview.kit?.status ?? null,
      participantIds: interview.participants.map((p) => p.userId),
      submittedInterviewerIds: interview.feedback.map((f) => f.interviewerId),
    })),
  };
}

/**
 * Decision model of one application: criteria x sources, submitted
 * scorecards only (never live notes).
 */
export async function getApplicationDecision(
  applicationId: string,
): Promise<ApplicationDecision | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.CANDIDATES,
    CacheTags.POSITIONS,
    CacheTags.ASSESSMENTS,
    CacheTags.EVALUATIONS,
    CacheTags.QUIZZES,
    CacheTags.QUESTIONS,
    CacheTags.SCORECARDS,
    CacheTags.INTERVIEWS,
  );

  const decision = await loadApplicationDecision(prisma, applicationId);

  if (decision) {
    cacheTag(
      entityTag.candidate(decision.candidateId),
      entityTag.position(decision.positionId),
    );
  }

  return decision;
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
    CacheTags.SCORECARDS,
    CacheTags.INTERVIEW_GUIDES,
    CacheTags.INTERVIEWS,
  );

  const [
    assessments,
    applications,
    positions,
    interviewsWithoutKit,
    completedInterviews,
  ] = await Promise.all([
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
    // Draft and open positions with the counts the setup rule needs; closed
    // positions are never listed
    prisma.position.findMany({
      where: { status: { in: ["draft", "open"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        _count: { select: { quizzes: true, interviewGuides: true } },
        scorecard: {
          select: {
            _count: { select: { criteria: { where: { archivedAt: null } } } },
          },
        },
      },
    }),
    // Scheduled interviews of open applications whose kit is not ready
    prisma.interview.findMany({
      where: {
        status: "scheduled",
        OR: [{ kit: { is: null } }, { kit: { status: { not: "ready" } } }],
        application: { stage: { notIn: CLOSED_STAGES } },
      },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        round: true,
        scheduledAt: true,
        participants: { select: { userId: true } },
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
    // Completed interviews of open applications: their missing scorecards
    prisma.interview.findMany({
      where: {
        status: "completed",
        application: { stage: { notIn: CLOSED_STAGES } },
      },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        round: true,
        participants: {
          select: { userId: true, user: { select: { name: true } } },
        },
        feedback: {
          where: { submittedAt: { not: null } },
          select: { interviewerId: true },
        },
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
    positionsWithIncompleteSetup: positions.flatMap((position) => {
      const { missing } = getPositionSetup({
        activeCriteriaCount: position.scorecard?._count.criteria ?? 0,
        quizCount: position._count.quizzes,
        guideCount: position._count.interviewGuides,
      });
      return missing.length > 0
        ? [
            {
              positionId: position.id,
              title: position.title,
              status: position.status,
              missing,
            },
          ]
        : [];
    }),
    interviewsWithoutKit: interviewsWithoutKit.map((interview) => ({
      interviewId: interview.id,
      applicationId: interview.application.id,
      ownerId: interview.application.ownerId,
      participantIds: interview.participants.map((p) => p.userId),
      candidateName: fullName(interview.application.candidate),
      positionTitle: interview.application.position.title,
      round: interview.round,
      scheduledAt: interview.scheduledAt,
    })),
    feedbackToFill: completedInterviews.flatMap((interview) => {
      const submitted = new Set(
        interview.feedback.map((feedback) => feedback.interviewerId),
      );
      return interview.participants
        .filter((participant) => !submitted.has(participant.userId))
        .map((participant) => ({
          interviewId: interview.id,
          applicationId: interview.application.id,
          ownerId: interview.application.ownerId,
          interviewerId: participant.userId,
          interviewerName: participant.user.name,
          candidateName: fullName(interview.application.candidate),
          positionTitle: interview.application.position.title,
          round: interview.round,
        }));
    }),
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
