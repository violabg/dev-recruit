/**
 * Centralized Cache Invalidation Utilities
 *
 * Provides consistent patterns for invalidating cache tags and paths
 * across the application. Use these helpers instead of calling updateTag()
 * and revalidatePath() directly in server actions.
 *
 * @see docs/CACHE_IMPLEMENTATION.md for caching strategy details
 */

import { revalidatePath, updateTag } from "next/cache";

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
  QUESTIONS_FAVORITES: "questions-favorites",
  POSITIONS: "positions",
  CANDIDATES: "candidates",
  INTERVIEWS: "interviews",
  EVALUATIONS: "evaluations",
  PRESETS: "presets",

  // Aggregate views
  DASHBOARD: "dashboard",

  // Legacy tags (for backward compatibility)
  QUIZ_DATA: "quiz-data",
  POSITION_DATA: "position-data",
  USER_DATA: "user-data",
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
  position: (id: string) => `positions-${id}`,
  candidate: (id: string) => `candidate-${id}`,
  interview: (id: string) => `interview-${id}`,
  evaluation: (id: string) => `evaluation-${id}`,
  evaluationInterview: (interviewId: string) =>
    `evaluation-interview-${interviewId}`,
  evaluationCandidate: (candidateId: string) =>
    `evaluation-candidate-${candidateId}`,
  preset: (id: string) => `preset-${id}`,
} as const;

// ============================================================================
// Quiz Cache Invalidation
// ============================================================================

/**
 * Invalidate quiz cache after create/update/delete operations
 */
export function invalidateQuizCache(options?: {
  quizId?: string;
  positionId?: string;
}) {
  updateTag(CacheTags.QUIZZES);
  updateTag(CacheTags.QUESTIONS);

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
  isFavorite?: boolean;
}) {
  updateTag(CacheTags.QUESTIONS);

  if (options?.questionId) {
    updateTag(entityTag.question(options.questionId));
  }

  if (options?.quizId) {
    updateTag(CacheTags.QUIZZES);
    updateTag(entityTag.quiz(options.quizId));
  }

  if (options?.isFavorite) {
    updateTag(CacheTags.QUESTIONS_FAVORITES);
  }
}

// ============================================================================
// Position Cache Invalidation
// ============================================================================

/**
 * Invalidate position cache after create/update/delete operations
 */
export function invalidatePositionCache(positionId?: string) {
  updateTag(CacheTags.POSITIONS);

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
}) {
  updateTag(CacheTags.CANDIDATES);

  if (options?.candidateId) {
    updateTag(entityTag.candidate(options.candidateId));
    revalidatePath(`/dashboard/candidates/${options.candidateId}`);
  }

  if (options?.positionId) {
    updateTag(entityTag.position(options.positionId));
    revalidatePath(`/dashboard/positions/${options.positionId}`);
  }

  revalidatePath("/dashboard/candidates");
}

// ============================================================================
// Interview Cache Invalidation
// ============================================================================

/**
 * Invalidate interview cache after create/update/delete operations
 */
export function invalidateInterviewCache(options?: {
  interviewId?: string;
  quizId?: string;
}) {
  updateTag(CacheTags.INTERVIEWS);

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

// ============================================================================
// Bulk Invalidation Helpers
// ============================================================================

/**
 * Invalidate all dashboard caches (use sparingly)
 */
export function invalidateAllDashboardCaches() {
  updateTag(CacheTags.QUIZZES);
  updateTag(CacheTags.QUESTIONS);
  updateTag(CacheTags.POSITIONS);
  updateTag(CacheTags.CANDIDATES);
  updateTag(CacheTags.INTERVIEWS);
  updateTag(CacheTags.EVALUATIONS);
  updateTag(CacheTags.PRESETS);

  revalidatePath("/dashboard");
}
