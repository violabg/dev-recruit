"use client";

import { useSessionRefresh } from "@/hooks/use-session-refresh";

/**
 * Client component that provides session refresh monitoring
 * This is a separate component because it uses the useSessionRefresh hook,
 * which is a client-side hook that needs to be in a client component
 */
export function SessionRefreshProvider() {
  useSessionRefresh();
  return null;
}
