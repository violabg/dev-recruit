import type { ActionCenterData } from "@/lib/data/applications";

/**
 * Applications that wait for an action of the viewer: the tests to evaluate,
 * the interviews without a ready preparation and the feedback to write. The
 * stale and setup queues are not actions on a single application.
 */
export function waitingApplicationIds(
  data: Pick<
    ActionCenterData,
    "assessmentsToEvaluate" | "interviewsWithoutKit" | "feedbackToFill"
  >,
): Set<string> {
  return new Set(
    [
      ...data.assessmentsToEvaluate,
      ...data.interviewsWithoutKit,
      ...data.feedbackToFill,
    ].map((row) => row.applicationId),
  );
}
