import type { AssessmentState } from "@/lib/utils/assessment-utils";

type AssessmentStatePresentation = {
  /** Italian label shown to the recruiter */
  label: string;
  /** Tint classes for a badge, built on the `stage-*` tokens */
  badge: string;
};

/**
 * Label and badge tint of every assessment state, defined once so each list
 * and page shows the same text and colour for the same state.
 */
export const ASSESSMENT_STATE_PRESENTATION: Record<
  AssessmentState,
  AssessmentStatePresentation
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
export function getAssessmentStatePresentation(
  state: string,
): AssessmentStatePresentation {
  return (
    ASSESSMENT_STATE_PRESENTATION[state as AssessmentState] ?? {
      label: state,
      badge: "bg-muted text-muted-foreground",
    }
  );
}
