/**
 * Cache utilities
 *
 * @deprecated Import from './cache-utils' instead for new code.
 * This file is kept for backward compatibility.
 */

import { revalidatePath } from "next/cache";

// Re-export new utilities for convenience
export {
  CacheTags,
  entityTag,
  invalidateCandidateCache,
  invalidateEvaluationCache,
  invalidateInterviewCache,
  invalidatePositionCache,
  invalidatePresetCache,
  invalidateProfileCache,
  invalidateQuestionCache,
  invalidateQuizCache,
} from "./cache-utils";

/**
 * @deprecated Use CacheTags from './cache-utils' instead
 */
export const CACHE_TAGS = {
  QUIZ_DATA: "quiz-data",
  POSITION_DATA: "position-data",
  USER_DATA: "user-data",
} as const;

/**
 * @deprecated Use entityTag.quiz from './cache-utils' instead
 */
export const getQuizCacheTag = (quizId: string) => `quiz-${quizId}`;

/**
 * @deprecated Use entityTag.position from './cache-utils' instead
 */
export const getPositionCacheTag = (positionId: string) =>
  `position-${positionId}`;

/**
 * @deprecated Use entityTag.user from './cache-utils' instead
 */
export const getUserCacheTag = (userId: string) => `user-${userId}`;

/**
 * @deprecated Use invalidateQuizCache from './cache-utils' instead
 */
export const revalidateQuizCache = (quizId?: string) => {
  revalidatePath("/dashboard/quizzes");

  if (quizId) {
    revalidatePath(`/dashboard/quizzes/${quizId}`);
    revalidatePath(`/dashboard/quizzes/${quizId}/edit`);
  }
};

/**
 * @deprecated Use invalidatePositionCache from './cache-utils' instead
 */
export const revalidatePositionCache = (positionId?: string) => {
  revalidatePath("/dashboard/positions");

  if (positionId) {
    revalidatePath(`/dashboard/positions/${positionId}`);
    revalidatePath(`/dashboard/positions/${positionId}/edit`);
  }
};

/**
 * @deprecated Use invalidateProfileCache from './cache-utils' instead
 */
export const revalidateUserCache = (userId?: string) => {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");

  if (userId) {
    // Add user-specific page revalidations here
  }
};
