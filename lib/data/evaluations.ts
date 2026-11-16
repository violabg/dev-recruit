import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import {
  answerEvaluationsSchema,
  criteriaAssessmentSchema,
  type AnswerEvaluations,
  type CriteriaAssessment,
} from "@/lib/schemas";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";

// Prisma type for evaluation with relations (JSON columns still raw)
type EvaluationRowWithRelations = Prisma.EvaluationGetPayload<{
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

// Evaluation with relations and its JSON columns typed. Rows saved before the
// detail existed, or with JSON that does not match the schema, read as null.
export type EvaluationWithRelations = Omit<
  EvaluationRowWithRelations,
  "answerEvaluations" | "criteriaAssessment"
> & {
  answerEvaluations: AnswerEvaluations | null;
  criteriaAssessment: CriteriaAssessment | null;
};

function toEvaluationWithRelations(
  row: EvaluationRowWithRelations,
): EvaluationWithRelations {
  const answerEvaluations =
    row.answerEvaluations === null
      ? null
      : answerEvaluationsSchema.safeParse(row.answerEvaluations);
  const criteriaAssessment =
    row.criteriaAssessment === null
      ? null
      : criteriaAssessmentSchema.safeParse(row.criteriaAssessment);

  return {
    ...row,
    answerEvaluations: answerEvaluations?.success
      ? answerEvaluations.data
      : null,
    criteriaAssessment: criteriaAssessment?.success
      ? criteriaAssessment.data
      : null,
  };
}

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

  const row = await prisma.evaluation.findUnique({
    where: { assessmentId },
    include: EVALUATION_INCLUDE,
  });
  return row ? toEvaluationWithRelations(row) : null;
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

  const rows = await prisma.evaluation.findMany({
    where: { candidateId },
    include: EVALUATION_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toEvaluationWithRelations);
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

  const row = await prisma.evaluation.findUnique({
    where: { id },
    include: EVALUATION_INCLUDE,
  });
  return row ? toEvaluationWithRelations(row) : null;
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
