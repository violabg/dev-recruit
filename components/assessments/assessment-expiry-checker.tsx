"use client";

import { closeExpiredAssessmentAction } from "@/lib/actions/assessments";
import { assessmentState } from "@/lib/utils/assessment-utils";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type Props = {
  assessmentId: string;
  status: string;
  startedAt: string | null;
  timeLimit: number | null;
};

/**
 * Closes an in-progress assessment that has run past its time limit, then
 * refreshes the page so the new status shows. Renders nothing.
 */
export function AssessmentExpiryChecker({
  assessmentId,
  status,
  startedAt,
  timeLimit,
}: Props) {
  const router = useRouter();
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (assessmentState({ status, startedAt, timeLimit }) !== "expired") {
      return;
    }
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    closeExpiredAssessmentAction(assessmentId)
      .then((result) => {
        if (result.success && result.closed) router.refresh();
      })
      .catch(() => {
        // Not critical: the status is corrected on the next visit
      })
      .finally(() => {
        isCheckingRef.current = false;
      });
  }, [assessmentId, status, startedAt, timeLimit, router]);

  return null;
}
