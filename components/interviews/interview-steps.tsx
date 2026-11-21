import { StationTrack, type Station } from "@/components/flow";
import type { InterviewStatus } from "@/lib/schemas";

export type InterviewStepKey = "prepare" | "live" | "feedback" | "decision";

const STEPS: { key: InterviewStepKey; label: string; hint: string }[] = [
  { key: "prepare", label: "Preparazione", hint: "Kit e domande" },
  { key: "live", label: "Live", hint: "Note e copertura" },
  { key: "feedback", label: "Scheda", hint: "Voti per criterio" },
  { key: "decision", label: "Decisione", hint: "Esito candidatura" },
];

/** Steps the interview status has already passed. */
function reachedIndex(status: InterviewStatus, feedbackSubmitted: boolean) {
  if (status === "scheduled") return 0;
  if (status === "in_progress") return 1;
  if (status === "completed") return feedbackSubmitted ? 3 : 2;
  return 0;
}

/**
 * Where the interview stands in its flow: preparation → live → scorecard →
 * decision, as a station track. The page you are on is the current station,
 * passed steps are green, every step is a link.
 */
export function InterviewSteps({
  applicationId,
  interviewId,
  current,
  status,
  feedbackSubmitted = false,
}: {
  applicationId: string;
  interviewId: string;
  current: InterviewStepKey;
  status: InterviewStatus;
  feedbackSubmitted?: boolean;
}) {
  const base = `/dashboard/applications/${applicationId}`;
  const href: Record<InterviewStepKey, string> = {
    prepare: `${base}/interviews/${interviewId}/prepare`,
    live: `${base}/interviews/${interviewId}/live`,
    feedback: `${base}/interviews/${interviewId}/feedback`,
    decision: `${base}/decision`,
  };
  const reached = status === "cancelled" ? -1 : reachedIndex(status, feedbackSubmitted);

  const stations: Station[] = STEPS.map((step, index) => ({
    key: step.key,
    label: step.label,
    hint: step.hint,
    href: href[step.key],
    state:
      step.key === current ? "current" : index < reached ? "done" : "todo",
  }));

  return (
    <nav aria-label="Fasi del colloquio">
      <StationTrack stations={stations} label="Fasi del colloquio" />
    </nav>
  );
}

/** Index of an interview step, for the next-action notch. */
export function interviewStepIndex(step: InterviewStepKey) {
  return STEPS.findIndex((s) => s.key === step);
}

export const INTERVIEW_STEP_COUNT = STEPS.length;
