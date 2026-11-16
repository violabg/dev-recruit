import type { ApplicationStage } from "@/lib/schemas";
import {
  STAGE_LABELS,
  type KanbanColumnKey,
} from "@/lib/utils/application-stage";

type ApplicationStagePresentation = {
  /** Italian label shown to the recruiter */
  label: string;
  /** Tint classes for a badge, built on the `stage-*` tokens */
  badge: string;
  /** Solid fill for a dot or a stepper step */
  dot: string;
};

/**
 * Label and tint of every application stage. The single presentation map of
 * application stages, separate from the assessment one: change a stage colour
 * only here.
 */
export const APPLICATION_STAGE_PRESENTATION: Record<
  ApplicationStage,
  ApplicationStagePresentation
> = {
  applied: {
    label: STAGE_LABELS.applied,
    badge: "bg-stage-pending/10 text-stage-pending",
    dot: "bg-stage-pending",
  },
  screening: {
    label: STAGE_LABELS.screening,
    badge: "bg-stage-progress/10 text-stage-progress",
    dot: "bg-stage-progress",
  },
  assessment: {
    label: STAGE_LABELS.assessment,
    badge: "bg-stage-progress/10 text-stage-progress",
    dot: "bg-stage-progress",
  },
  interview: {
    label: STAGE_LABELS.interview,
    badge: "bg-stage-progress/10 text-stage-progress",
    dot: "bg-stage-progress",
  },
  decision: {
    label: STAGE_LABELS.decision,
    badge: "bg-stage-progress/10 text-stage-progress",
    dot: "bg-stage-progress",
  },
  offer: {
    label: STAGE_LABELS.offer,
    badge: "bg-stage-done/10 text-stage-done",
    dot: "bg-stage-done",
  },
  hired: {
    label: STAGE_LABELS.hired,
    badge: "bg-stage-done/10 text-stage-done",
    dot: "bg-stage-done",
  },
  rejected: {
    label: STAGE_LABELS.rejected,
    badge: "bg-stage-cancelled/10 text-stage-cancelled",
    dot: "bg-stage-cancelled",
  },
  withdrawn: {
    label: STAGE_LABELS.withdrawn,
    badge: "bg-stage-expired/10 text-stage-expired",
    dot: "bg-stage-expired",
  },
};

export function getApplicationStagePresentation(
  stage: string,
): ApplicationStagePresentation {
  return (
    APPLICATION_STAGE_PRESENTATION[stage as ApplicationStage] ?? {
      label: stage,
      badge: "bg-muted text-muted-foreground",
      dot: "bg-muted-foreground",
    }
  );
}

/** Title of every kanban column: the stage labels plus the closed column */
export const KANBAN_COLUMN_LABEL: Record<KanbanColumnKey, string> = {
  applied: STAGE_LABELS.applied,
  screening: STAGE_LABELS.screening,
  assessment: STAGE_LABELS.assessment,
  interview: STAGE_LABELS.interview,
  decision: STAGE_LABELS.decision,
  offer: STAGE_LABELS.offer,
  hired: STAGE_LABELS.hired,
  closed: "Chiuse",
};
