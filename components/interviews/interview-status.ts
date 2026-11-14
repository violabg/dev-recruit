import type { InterviewState } from "@/lib/utils/interview-utils";

type InterviewStatePresentation = {
  /** Italian label shown to the recruiter */
  label: string;
  /** Tint classes for a badge, built on the `stage-*` tokens */
  badge: string;
};

/**
 * Label and badge tint of every interview state, defined once so each list
 * and page shows the same text and colour for the same state.
 */
export const INTERVIEW_STATE_PRESENTATION: Record<
  InterviewState,
  InterviewStatePresentation
> = {
  pending: {
    label: "In attesa",
    badge: "bg-stage-pending/10 text-stage-pending",
  },
  in_progress: {
    label: "In corso",
    badge: "bg-stage-progress/10 text-stage-progress",
  },
  completed: {
    label: "Completato",
    badge: "bg-stage-done/10 text-stage-done",
  },
  cancelled: {
    label: "Annullato",
    badge: "bg-stage-cancelled/10 text-stage-cancelled",
  },
  expired: {
    label: "Scaduto",
    badge: "bg-stage-expired/10 text-stage-expired",
  },
};

/**
 * Presentation of a stored status or a derived state. Server components pass
 * the stored status: they cannot derive `expired`, because reading the current
 * time is not allowed while prerendering.
 */
export function getInterviewStatePresentation(
  state: string,
): InterviewStatePresentation {
  return (
    INTERVIEW_STATE_PRESENTATION[state as InterviewState] ?? {
      label: state,
      badge: "bg-muted text-muted-foreground",
    }
  );
}
