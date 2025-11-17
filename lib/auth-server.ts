"use server";

import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Get current user session from Better Auth
 * Use this in server actions to authorize requests
 */
export async function getCurrentUser() {
  try {
    const headersList = await headers();
    const response = await auth.api.getSession({
      headers: headersList,
    });

    if (!response || !response.user) {
      return null;
    }

    return response.user;
  } catch (error) {
    console.error("Failed to get current user:", error);
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
