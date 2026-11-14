/**
 * Centralized Cache Invalidation Utilities
 *
 * Provides consistent patterns for invalidating cache tags and paths
 * across the application. Use these helpers instead of calling updateTag()
 * and revalidatePath() directly in server actions.
 *
 * IMPORTANT: Use the correct function based on context:
 * - Server Actions: Use the standard functions (invalidateQuizCache, etc.)
 * - Route Handlers: Use the *InRouteHandler variants (invalidateEvaluationCacheInRouteHandler, etc.)
 *
 * TAGGING RULE (prevents stale data):
 * Every cached read must `cacheTag()` the collection tag of EVERY entity it
 * reads, including joined/included relations (e.g. a candidate list that
 * includes interview status is tagged CANDIDATES + INTERVIEWS + POSITIONS).
 * Every mutation calls the helper of its own entity, and deletes pass
 * `deleted: true` so collections removed by DB cascades are expired too.
 */

import { revalidatePath, revalidateTag, updateTag } from "next/cache";

// ============================================================================
// Cache Tag Constants
// ============================================================================

/**
 * Global cache tags for list views and collections
 */
export const CacheTags = {
  // Entity collections
  QUIZZES: "quizzes",
  QUESTIONS: "questions",
  POSITIONS: "positions",
  CANDIDATES: "candidates",
  INTERVIEWS: "interviews",
  EVALUATIONS: "evaluations",
  BEHAVIORAL_RUBRICS: "behavioral-rubrics",
  PRESETS: "presets",
  REFERENCE_DATA: "reference-data",
} as const;

/**
 * Type for cache tag values
 */
export type CacheTagValue = (typeof CacheTags)[keyof typeof CacheTags];

/**
 * Generate cache tag for a specific entity by ID
 */
export const entityTag = {
  quiz: (id: string) => `quiz-${id}`,
  question: (id: string) => `question-${id}`,
  // Plural for historical reasons: renaming it would orphan cached entries
  position: (id: string) => `positions-${id}`,
  candidate: (id: string) => `candidate-${id}`,
  interview: (id: string) => `interview-${id}`,
  evaluation: (id: string) => `evaluation-${id}`,
  evaluationInterview: (interviewId: string) =>
    `evaluation-interview-${interviewId}`,
  evaluationCandidate: (candidateId: string) =>
    `evaluation-candidate-${candidateId}`,
  behavioralRubric: (candidateId: string, positionId: string) =>
    `behavioral-rubric-${candidateId}-${positionId}`,
  preset: (id: string) => `preset-${id}`,
  referenceCategory: (category: string) => `reference-data-${category}`,
} as const;

/**
 * Collections whose rows are removed by an `onDelete: Cascade` when a parent
 * entity is deleted (see prisma/schema.prisma). Deleting the parent must also
 * expire every cached read of these collections, otherwise lists and counts
 * keep showing rows that no longer exist.
 */
const CASCADE_ON_DELETE = {
  position: [
    CacheTags.QUIZZES,
    CacheTags.INTERVIEWS,
    CacheTags.EVALUATIONS,
    CacheTags.CANDIDATES,
    CacheTags.BEHAVIORAL_RUBRICS,
  ],
  quiz: [CacheTags.INTERVIEWS, CacheTags.EVALUATIONS],
  candidate: [
    CacheTags.INTERVIEWS,
    CacheTags.EVALUATIONS,
    CacheTags.BEHAVIORAL_RUBRICS,
  ],
  interview: [CacheTags.EVALUATIONS],
} as const;

function expireTags(tags: readonly string[]) {
  for (const tag of tags) updateTag(tag);
}

// ============================================================================
// Quiz Cache Invalidation
// ============================================================================

/**
 * Invalidate quiz cache after create/update/delete operations
 */
export function invalidateQuizCache(options?: {
  quizId?: string;
  positionId?: string;
  /** Quiz was deleted: also expire cascaded interviews/evaluations */
  deleted?: boolean;
}) {
  updateTag(CacheTags.QUIZZES);
  updateTag(CacheTags.QUESTIONS);

  if (options?.deleted) {
    expireTags(CASCADE_ON_DELETE.quiz);
  }

  if (options?.quizId) {
    updateTag(entityTag.quiz(options.quizId));
    revalidatePath(`/dashboard/quizzes/${options.quizId}`);
    revalidatePath(`/dashboard/quizzes/${options.quizId}/edit`);
  }

  if (options?.positionId) {
    updateTag(entityTag.position(options.positionId));
  }

  // Always revalidate quiz listing
  revalidatePath("/dashboard/quizzes");
}

// ============================================================================
// Question Cache Invalidation
// ============================================================================

/**
 * Invalidate question cache after create/update/delete operations
 */
export function invalidateQuestionCache(options?: {
  questionId?: string;
  quizId?: string;
}) {
  updateTag(CacheTags.QUESTIONS);

  if (options?.questionId) {
    updateTag(entityTag.question(options.questionId));
  }

  if (options?.quizId) {
    updateTag(CacheTags.QUIZZES);
    updateTag(entityTag.quiz(options.quizId));
  }
}

// ============================================================================
// Position Cache Invalidation
// ============================================================================

/**
 * Invalidate position cache after create/update/delete operations
 */
export function invalidatePositionCache(
  positionId?: string,
  options?: {
    /** Position was deleted: also expire cascaded quizzes/interviews/etc. */
    deleted?: boolean;
  },
) {
  updateTag(CacheTags.POSITIONS);

  if (options?.deleted) {
    expireTags(CASCADE_ON_DELETE.position);
  }

  if (positionId) {
    updateTag(entityTag.position(positionId));
    revalidatePath(`/dashboard/positions/${positionId}`);
    revalidatePath(`/dashboard/positions/${positionId}/edit`);
  }

  revalidatePath("/dashboard/positions");
}

// ============================================================================
// Candidate Cache Invalidation
// ============================================================================

/**
 * Invalidate candidate cache after create/update/delete operations
 */
export function invalidateCandidateCache(options?: {
  candidateId?: string;
  positionId?: string;
  positionIds?: string[];
  /** Candidate was deleted: also expire cascaded interviews/evaluations/rubrics */
  deleted?: boolean;
}) {
  updateTag(CacheTags.CANDIDATES);

  if (options?.deleted) {
    expireTags(CASCADE_ON_DELETE.candidate);
  }

  if (options?.candidateId) {
    updateTag(entityTag.candidate(options.candidateId));
    revalidatePath(`/dashboard/candidates/${options.candidateId}`);
  }

  if (options?.positionId) {
    updateTag(entityTag.position(options.positionId));
    revalidatePath(`/dashboard/positions/${options.positionId}`);
  }

  if (options?.positionIds) {
    for (const positionId of options.positionIds) {
      updateTag(entityTag.position(positionId));
      revalidatePath(`/dashboard/positions/${positionId}`);
    }
  }

  revalidatePath("/dashboard/candidates");
}

// ============================================================================
// Interview Cache Invalidation
// ============================================================================

// Reference data cache invalidation
export function invalidateReferenceDataCache(category?: string) {
  updateTag(CacheTags.REFERENCE_DATA);
  if (category) updateTag(entityTag.referenceCategory(category));
}
/**
 * Invalidate interview cache after create/update/delete operations
 * Use this in Server Actions only.
 */
export function invalidateInterviewCache(options?: {
  interviewId?: string;
  quizId?: string;
  /** Interview(s) deleted: also expire cascaded evaluations */
  deleted?: boolean;
}) {
  updateTag(CacheTags.INTERVIEWS);

  if (options?.deleted) {
    expireTags(CASCADE_ON_DELETE.interview);
  }

  if (options?.interviewId) {
    updateTag(entityTag.interview(options.interviewId));
    revalidatePath(`/dashboard/interviews/${options.interviewId}`);
  }

  if (options?.quizId) {
    revalidatePath(`/dashboard/quizzes/${options.quizId}`);
    revalidatePath(`/dashboard/quizzes/${options.quizId}/invite`);
  }

  revalidatePath("/dashboard/interviews");
}

// ============================================================================
// Evaluation Cache Invalidation
// ============================================================================

/**
 * Invalidate evaluation cache after create/update/delete operations
 * Use this in Server Actions only. For Route Handlers, use invalidateEvaluationCacheInRouteHandler.
 */
export function invalidateEvaluationCache(options?: {
  evaluationId?: string;
  interviewId?: string;
  candidateId?: string;
}) {
  updateTag(CacheTags.EVALUATIONS);

  if (options?.evaluationId) {
    updateTag(entityTag.evaluation(options.evaluationId));
  }

  if (options?.interviewId) {
    updateTag(entityTag.evaluationInterview(options.interviewId));
    revalidatePath(`/dashboard/interviews/${options.interviewId}`);
  }

  if (options?.candidateId) {
    updateTag(entityTag.evaluationCandidate(options.candidateId));
    revalidatePath(`/dashboard/candidates/${options.candidateId}`);
    revalidatePath(`/dashboard/candidates/${options.candidateId}/evaluations`);
  }
}

// ============================================================================
// Behavioral Rubric Cache Invalidation
// ============================================================================

export function invalidateBehavioralRubricCache(options: {
  candidateId: string;
  positionId: string;
}) {
  updateTag(CacheTags.BEHAVIORAL_RUBRICS);
  updateTag(
    entityTag.behavioralRubric(options.candidateId, options.positionId),
  );
  revalidatePath(`/dashboard/candidates/${options.candidateId}`);
  revalidatePath(
    `/dashboard/candidates/${options.candidateId}/evaluation-dashboard`,
  );
}

/**
 * Invalidate evaluation cache from Route Handlers (uses revalidateTag instead of updateTag)
 * Use this in Route Handlers (app/api/*). For Server Actions, use invalidateEvaluationCache.
 *
 * Uses { expire: 0 } for immediate expiration since we want the new data to show right away.
 */
export function invalidateEvaluationCacheInRouteHandler(options?: {
  evaluationId?: string;
  interviewId?: string;
  candidateId?: string;
}) {
  revalidateTag(CacheTags.EVALUATIONS, { expire: 0 });

  if (options?.evaluationId) {
    revalidateTag(entityTag.evaluation(options.evaluationId), { expire: 0 });
  }

  if (options?.interviewId) {
    revalidateTag(entityTag.evaluationInterview(options.interviewId), {
      expire: 0,
    });
    revalidatePath(`/dashboard/interviews/${options.interviewId}`);
  }

  if (options?.candidateId) {
    revalidateTag(entityTag.evaluationCandidate(options.candidateId), {
      expire: 0,
    });
    revalidatePath(`/dashboard/candidates/${options.candidateId}`);
    revalidatePath(`/dashboard/candidates/${options.candidateId}/evaluations`);
  }
}

// ============================================================================
// Preset Cache Invalidation
// ============================================================================

/**
 * Invalidate preset cache after create/update/delete operations
 */
export function invalidatePresetCache(presetId?: string) {
  updateTag(CacheTags.PRESETS);

  if (presetId) {
    updateTag(entityTag.preset(presetId));
    revalidatePath(`/dashboard/presets/${presetId}`);
    revalidatePath(`/dashboard/presets/${presetId}/edit`);
  }

  revalidatePath("/dashboard/presets");
}

// ============================================================================
// Profile Cache Invalidation
// ============================================================================

/**
 * Invalidate user profile cache
 */
export function invalidateProfileCache() {
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/profile/edit");
  revalidatePath("/dashboard");
}
