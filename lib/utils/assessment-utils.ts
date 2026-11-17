import { addMinutes, isAfter, parseISO } from "date-fns";

/**
 * Assessment lifecycle rules. Pure functions shared by the server actions and
 * the client timers, so "has this assessment run out of time?" has exactly one
 * answer.
 */

type DateInput = string | Date | null | undefined;

type TimedAssessment = {
  status: string;
  startedAt: DateInput;
  timeLimit: number | null | undefined;
};

const toDate = (value: string | Date) =>
  typeof value === "string" ? parseISO(value) : new Date(value);

/**
 * Seconds after the time limit during which a last answer is still accepted.
 * The candidate's timer and the server clock never agree to the second, and
 * the answer being typed when time runs out is submitted right after.
 */
export const EXPIRY_GRACE_SECONDS = 60;

export function getAssessmentExpiryDate(
  startedAt: DateInput,
  timeLimitMinutes: number | null | undefined,
) {
  if (!startedAt || !timeLimitMinutes || timeLimitMinutes <= 0) return null;
  return addMinutes(toDate(startedAt), timeLimitMinutes);
}

export function isAssessmentExpired(
  startedAt: DateInput,
  completedAt: DateInput,
  timeLimitMinutes: number | null | undefined,
  now: Date = new Date(),
) {
  if (!startedAt) return false; // not started yet
  if (completedAt) return false; // already completed
  if (!timeLimitMinutes || timeLimitMinutes <= 0) return false; // no time limit configured

  const expiry = getAssessmentExpiryDate(startedAt, timeLimitMinutes);
  if (!expiry) return false;
  return isAfter(now, expiry);
}

/**
 * Seconds left before the time limit: null when there is no limit or the
 * assessment has not started, 0 once the time is up.
 */
export function getRemainingSeconds(
  startedAt: DateInput,
  timeLimitMinutes: number | null | undefined,
  now: Date = new Date(),
): number | null {
  const expiry = getAssessmentExpiryDate(startedAt, timeLimitMinutes);
  if (!expiry || !timeLimitMinutes) return null;

  const remaining = Math.ceil((expiry.getTime() - now.getTime()) / 1000);
  return Math.max(0, Math.min(remaining, timeLimitMinutes * 60));
}

export type AssessmentState =
  | "pending"
  | "in_progress"
  /** Started, not closed, and past the time limit */
  | "expired"
  | "completed"
  | "cancelled";

/**
 * The effective state of an assessment. The stored status only changes when
 * something writes it, so an in-progress assessment past its time limit is
 * reported as "expired" here.
 */
export function assessmentState(
  assessment: TimedAssessment,
  now: Date = new Date(),
): AssessmentState {
  if (assessment.status === "completed") return "completed";
  if (assessment.status === "cancelled") return "cancelled";
  if (!assessment.startedAt || assessment.status === "pending")
    return "pending";

  return isAssessmentExpired(
    assessment.startedAt,
    null,
    assessment.timeLimit,
    now,
  )
    ? "expired"
    : "in_progress";
}

/** Whether an answer submitted at `now` is still accepted. */
export function acceptsAnswers(
  assessment: TimedAssessment,
  now: Date = new Date(),
): boolean {
  const graceStart = new Date(now.getTime() - EXPIRY_GRACE_SECONDS * 1000);
  const state = assessmentState(assessment, graceStart);
  return state === "pending" || state === "in_progress";
}
