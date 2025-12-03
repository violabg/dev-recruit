import { addMinutes, isAfter, parseISO } from "date-fns";

export function getInterviewExpiryDate(
  startedAt: string | Date | null | undefined,
  timeLimitMinutes: number | null | undefined
) {
  if (!startedAt || !timeLimitMinutes || timeLimitMinutes <= 0) return null;
  const start =
    typeof startedAt === "string" ? parseISO(startedAt) : new Date(startedAt);
  return addMinutes(start, timeLimitMinutes);
}

export function isInterviewExpired(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
  timeLimitMinutes: number | null | undefined
) {
  if (!startedAt) return false; // not started yet
  if (completedAt) return false; // already completed
  if (!timeLimitMinutes || timeLimitMinutes <= 0) return false; // no time limit configured

  const expiry = getInterviewExpiryDate(startedAt, timeLimitMinutes);
  if (!expiry) return false;
  return isAfter(new Date(), expiry);
}

const interviewUtils = {
  getInterviewExpiryDate,
  isInterviewExpired,
};

export default interviewUtils;
