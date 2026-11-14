"use client";

import { closeExpiredInterviewAction } from "@/lib/actions/interviews";
import { interviewState } from "@/lib/utils/interview-utils";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type Props = {
  interviewId: string;
  status: string;
  startedAt: string | null;
  timeLimit: number | null;
};

/**
 * Closes an in-progress interview that has run past its time limit, then
 * refreshes the page so the new status shows. Renders nothing.
 */
export function InterviewExpiryChecker({
  interviewId,
  status,
  startedAt,
  timeLimit,
}: Props) {
  const router = useRouter();
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (interviewState({ status, startedAt, timeLimit }) !== "expired") {
      return;
    }
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    closeExpiredInterviewAction(interviewId)
      .then((result) => {
        if (result.success && result.closed) router.refresh();
      })
      .catch(() => {
        // Not critical: the status is corrected on the next visit
      })
      .finally(() => {
        isCheckingRef.current = false;
      });
  }, [interviewId, status, startedAt, timeLimit, router]);

  return null;
}
