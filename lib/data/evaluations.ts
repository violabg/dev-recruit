import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";

// Prisma type for evaluation with relations
export type EvaluationWithRelations = Prisma.EvaluationGetPayload<{
  include: {
    assessment: {
      select: {
        id: true;
        status: true;
        quiz: {
          select: {
            id: true;
            title: true;
          };
        };
        candidate: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
          };
        };
      };
    };
    candidate: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
      };
    };
    position: {
      select: {
        id: true;
        title: true;
      };
    };
    creator: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

// EVALUATION_INCLUDE joins these collections; reads must be tagged with them
// so renaming a candidate/position/quiz or rescoring an assessment refreshes.
const EVALUATION_RELATION_TAGS = [
  CacheTags.ASSESSMENTS,
  CacheTags.CANDIDATES,
  CacheTags.POSITIONS,
  CacheTags.QUIZZES,
] as const;

// Reusable include pattern for evaluation queries
const EVALUATION_INCLUDE = {
  assessment: {
    select: {
      id: true,
      status: true,
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  candidate: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  position: {
    select: {
      id: true,
      title: true,
    },
  },
  creator: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

/**
 * Get evaluation for a specific assessment (1:1 relationship)
 */
export async function getEvaluationByAssessmentId(
  assessmentId: string,
): Promise<EvaluationWithRelations | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.EVALUATIONS,
    ...EVALUATION_RELATION_TAGS,
    entityTag.evaluationAssessment(assessmentId),
  );

  return prisma.evaluation.findUnique({
    where: { assessmentId },
    include: EVALUATION_INCLUDE,
  });
}

/**
 * Get all evaluations for a candidate (multiple per candidate, one per position)
 */
export async function getEvaluationsByCandidateId(
  candidateId: string,
): Promise<EvaluationWithRelations[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.EVALUATIONS,
    ...EVALUATION_RELATION_TAGS,
    entityTag.evaluationCandidate(candidateId),
  );

  return prisma.evaluation.findMany({
    where: { candidateId },
    include: EVALUATION_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single evaluation by ID
 */
export async function getEvaluationById(
  id: string,
): Promise<EvaluationWithRelations | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.EVALUATIONS,
    ...EVALUATION_RELATION_TAGS,
    entityTag.evaluation(id),
  );

  return prisma.evaluation.findUnique({
    where: { id },
    include: EVALUATION_INCLUDE,
  });
}

/**
 * Check if a candidate already has an evaluation for a specific position
 */
export async function hasEvaluationForPosition(
  candidateId: string,
  positionId: string,
): Promise<boolean> {
  "use cache";
  cacheLife("minutes");
  cacheTag(
    CacheTags.EVALUATIONS,
    entityTag.evaluationCandidate(candidateId),
  );

  const count = await prisma.evaluation.count({
    where: {
      candidateId,
      positionId,
      assessmentId: null, // Only candidate (resume) evaluations, not assessment ones
    },
  });

  return count > 0;
}

/**
 * Get evaluation count for dashboard stats
 */
export async function getEvaluationStats() {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.EVALUATIONS);

  const [assessmentEvaluations, candidateEvaluations] = await Promise.all([
    prisma.evaluation.count({ where: { assessmentId: { not: null } } }),
    prisma.evaluation.count({
      where: { candidateId: { not: null }, assessmentId: null },
    }),
  ]);

  return {
    assessmentEvaluations,
    candidateEvaluations,
    total: assessmentEvaluations + candidateEvaluations,
  };
}
