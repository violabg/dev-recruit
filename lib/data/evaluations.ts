import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { cacheLife, cacheTag } from "next/cache";

// Prisma type for evaluation with relations
export type EvaluationWithRelations = Prisma.EvaluationGetPayload<{
  include: {
    interview: {
      select: {
        id: true;
        status: true;
        score: true;
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

// Reusable include pattern for evaluation queries
const EVALUATION_INCLUDE = {
  interview: {
    select: {
      id: true,
      status: true,
      score: true,
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
 * Get evaluation for a specific interview (1:1 relationship)
 */
export async function getEvaluationByInterviewId(
  interviewId: string
): Promise<EvaluationWithRelations | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("evaluations", `evaluation-interview-${interviewId}`);

  return prisma.evaluation.findUnique({
    where: { interviewId },
    include: EVALUATION_INCLUDE,
  });
}

/**
 * Get all evaluations for a candidate (multiple per candidate, one per position)
 */
export async function getEvaluationsByCandidateId(
  candidateId: string
): Promise<EvaluationWithRelations[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("evaluations", `evaluation-candidate-${candidateId}`);

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
  id: string
): Promise<EvaluationWithRelations | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("evaluations", `evaluation-${id}`);

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
  positionId: string
): Promise<boolean> {
  "use cache";
  cacheLife("minutes");
  cacheTag("evaluations", `evaluation-candidate-${candidateId}`);

  const count = await prisma.evaluation.count({
    where: {
      candidateId,
      positionId,
      interviewId: null, // Only candidate (resume) evaluations, not interview ones
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
  cacheTag("evaluations");

  const [interviewEvaluations, candidateEvaluations] = await Promise.all([
    prisma.evaluation.count({ where: { interviewId: { not: null } } }),
    prisma.evaluation.count({
      where: { candidateId: { not: null }, interviewId: null },
    }),
  ]);

  return {
    interviewEvaluations,
    candidateEvaluations,
    total: interviewEvaluations + candidateEvaluations,
  };
}
