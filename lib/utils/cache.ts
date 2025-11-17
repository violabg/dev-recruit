import { revalidatePath } from "next/cache";

/**
 * Cache tags used throughout the application
 */
export const CACHE_TAGS = {
  QUIZ_DATA: "quiz-data",
  POSITION_DATA: "position-data",
  USER_DATA: "user-data",
} as const;

/**
 * Generate cache tag for a specific quiz
 */
export const getQuizCacheTag = (quizId: string) => `quiz-${quizId}`;

/**
 * Generate cache tag for a specific position
 */
export const getPositionCacheTag = (positionId: string) =>
  `position-${positionId}`;

/**
 * Generate cache tag for a specific user
 */
export const getUserCacheTag = (userId: string) => `user-${userId}`;

/**
 * Revalidate quiz-related pages and data
 */
export const revalidateQuizCache = (quizId?: string) => {
  // Revalidate quiz listing pages
  revalidatePath("/dashboard/quizzes");

  // Revalidate specific quiz page if ID provided
  if (quizId) {
    revalidatePath(`/dashboard/quizzes/${quizId}`);
    revalidatePath(`/dashboard/quizzes/${quizId}/edit`);
  }
};

/**
 * Revalidate position-related pages and data
 */
export const revalidatePositionCache = (positionId?: string) => {
  // Revalidate position listing pages
  revalidatePath("/dashboard/positions");

  // Revalidate specific position page if ID provided
  if (positionId) {
    revalidatePath(`/dashboard/positions/${positionId}`);
    revalidatePath(`/dashboard/positions/${positionId}/edit`);
  }
};

/**
 * Revalidate user-related pages and data
 */
export const revalidateUserCache = (userId?: string) => {
  // Revalidate user profile and dashboard
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");

  // Can be extended for user-specific pages if needed
  if (userId) {
    // Add user-specific page revalidations here
  }
};
