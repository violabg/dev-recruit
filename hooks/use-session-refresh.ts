"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Hook to monitor and refresh session periodically
 * Automatically logs user out if session becomes invalid
 *
 * @param interval - Refresh interval in milliseconds (default: 5 minutes)
 *
 * Usage in layout or app root:
 * ```tsx
 * export function RootLayout({ children }) {
 *   useSessionRefresh();
 *   return <>{children}</>;
 * }
 * ```
 */
export function useSessionRefresh(interval = 5 * 60 * 1000) {
  const router = useRouter();

  useEffect(() => {
    // Check session immediately
    const checkSession = async () => {
      try {
        // getSession returns the session data directly
        const session = await authClient.getSession();

        // Check if session or user is invalid
        if (!session?.data?.user) {
          // Session is invalid, redirect to login
          toast.error("La tua sessione è scaduta. Accedi di nuovo.");
          router.push("/auth/login");
          return;
        }
      } catch (error) {
        console.error("Failed to check session:", error);
        // On error, assume session is invalid and redirect
        toast.error("Errore di sessione. Accedi di nuovo.");
        router.push("/auth/login");
      }
    };

    // Run initial check
    checkSession();

    // Then set up periodic refresh
    const timer = setInterval(checkSession, interval);

    return () => clearInterval(timer);
  }, [interval, router]);
}
