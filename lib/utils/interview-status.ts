import type {
  GuideSectionKind,
  InterviewStatus,
  KitStatus,
} from "@/lib/schemas";

/**
 * Interview rules. Pure functions: no Next.js, no Prisma, no clock.
 */

/** Statuses from which each transition is allowed: the single source */
export const INTERVIEW_TRANSITIONS: Record<
  "start" | "complete" | "cancel" | "no_show" | "reschedule",
  readonly InterviewStatus[]
> = {
  start: ["scheduled"],
  complete: ["in_progress"],
  cancel: ["scheduled"],
  no_show: ["scheduled"],
  reschedule: ["scheduled"],
};

export function canTransition(
  status: InterviewStatus,
  transition: keyof typeof INTERVIEW_TRANSITIONS,
): boolean {
  return INTERVIEW_TRANSITIONS[transition].includes(status);
}

export type InterviewFeedbackFacts = {
  status: InterviewStatus;
  participantIds: string[];
  submittedInterviewerIds: string[];
};

const IGNORED_STATUSES: readonly InterviewStatus[] = ["cancelled", "no_show"];
const OPEN_STATUSES: readonly InterviewStatus[] = ["scheduled", "in_progress"];

function everyParticipantSubmitted(interview: InterviewFeedbackFacts) {
  return interview.participantIds.every((id) =>
    interview.submittedInterviewerIds.includes(id),
  );
}

/**
 * true when at least one interview is completed, none is scheduled or
 * in_progress, and every participant (lead and observers) of every completed
 * interview submitted. Cancelled and no-show interviews are ignored.
 */
export function allFeedbackSubmitted(
  interviews: readonly InterviewFeedbackFacts[],
): boolean {
  const relevant = interviews.filter(
    (interview) => !IGNORED_STATUSES.includes(interview.status),
  );
  if (relevant.some((interview) => OPEN_STATUSES.includes(interview.status))) {
    return false;
  }
  const completed = relevant.filter(
    (interview) => interview.status === "completed",
  );
  return completed.length > 0 && completed.every(everyParticipantSubmitted);
}

/** Facts for getNextAction: one entry per interview. */
export function toNextActionInterviewFacts(
  interviews: readonly (InterviewFeedbackFacts & {
    id: string;
    kitStatus: KitStatus | null;
  })[],
): {
  id: string;
  status: InterviewStatus;
  kitReady: boolean;
  feedbackMissing: boolean;
}[] {
  return interviews.map((interview) => ({
    id: interview.id,
    status: interview.status,
    kitReady: interview.kitStatus === "ready",
    feedbackMissing:
      interview.status === "completed" &&
      !everyParticipantSubmitted(interview),
  }));
}

/**
 * Maximum number of personalized questions of a kit, so that they take at
 * most 40% of all kit questions: with T template questions the cap is
 * floor(2T/3); with no template question it is floor(0.4 * duration / 5).
 */
export function personalizedQuestionCap(
  templateQuestionCount: number,
  durationMinutes: number,
): number {
  return templateQuestionCount > 0
    ? Math.floor((2 * templateQuestionCount) / 3)
    : Math.floor((0.4 * durationMinutes) / 5);
}

/**
 * Section of an AI or manual item: the first section of that kind, else the
 * last section whose kind is not 'closing', else the last section; null when
 * there are no sections.
 */
export function pickKitSection<
  T extends { id: string; kind: GuideSectionKind; order: number },
>(sections: readonly T[], kind: GuideSectionKind): T | null {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  const sameKind = sorted.find((section) => section.kind === kind);
  if (sameKind) return sameKind;
  const notClosing = sorted.filter((section) => section.kind !== "closing");
  if (notClosing.length > 0) return notClosing[notClosing.length - 1];
  return sorted.length > 0 ? sorted[sorted.length - 1] : null;
}
