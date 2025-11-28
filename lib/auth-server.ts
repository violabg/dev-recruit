"use server";

import { headers } from "next/headers";
import { auth } from "./auth";
import { authLogger } from "./services/logger";

/**
 * Get current user session from Better Auth
 * Use this in server actions to authorize requests
 * Note: This requires headers() to be available (not during prerendering)
 */
export async function getCurrentUser() {
  try {
    // Check if headers() is available (will throw during prerendering)
    const headersList = await headers();
    const response = await auth.api.getSession({
      headers: headersList,
    });

    if (!response || !response.user) {
      return null;
    }

    return response.user;
  } catch (error) {
    // Log only if it's not a prerendering error
    if (error instanceof Error && !error.message.includes("prerendering")) {
      authLogger.error("Failed to get current user", { error });
    }
    return null;
  }
}

/**
 * Require user to be authenticated
 * Throws an error if user is not authenticated
 * Use this in protected server actions
 */
export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  return user;
}
