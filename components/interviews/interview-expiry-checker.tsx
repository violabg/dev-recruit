"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  interviewId: string;
  status: string;
  startedAt: string | null;
  timeLimit: number | null;
};

/**
 * Client component that checks if an in-progress interview has expired
 * and cancels it via API if needed. Only runs for in_progress interviews
 * with a time limit.
 */
export function InterviewExpiryChecker({
  interviewId,
  status,
  startedAt,
  timeLimit,
}: Props) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Only check for in_progress interviews with a time limit
    if (
      status !== "in_progress" ||
      !startedAt ||
      !timeLimit ||
      timeLimit <= 0
    ) {
      return;
    }

    // Check if already expired based on client time
    const startTime = new Date(startedAt).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - startTime) / (1000 * 60);

    if (elapsedMinutes <= timeLimit) {
      // Not expired yet, no need to check
      return;
    }

    // Interview appears expired, call API to cancel
    const checkExpiry = async () => {
      if (isChecking) return;
      setIsChecking(true);

      try {
        const response = await fetch(
          `/api/interviews/${interviewId}/cancel-expired`,
          {
            method: "POST",
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.cancelled) {
            // Refresh the page to show updated status
            router.refresh();
          }
        }
      } catch (error) {
        console.error("Failed to check interview expiry:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkExpiry();
  }, [interviewId, status, startedAt, timeLimit, router, isChecking]);

  // This component renders nothing - it's purely for side effects
  return null;
}
