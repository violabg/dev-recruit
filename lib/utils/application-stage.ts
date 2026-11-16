import type { ApplicationStage } from "@/lib/schemas";

/**
 * Application stage rules. Pure functions: no Next.js, no Prisma, no clock.
 * Every time-dependent rule takes `now` from the caller.
 */

/** Order of the open path, from the first step to the hire */
export const STAGE_ORDER: readonly ApplicationStage[] = [
  "applied",
  "screening",
  "assessment",
  "interview",
  "decision",
  "offer",
  "hired",
];

export const CLOSED_STAGES: readonly ApplicationStage[] = [
  "rejected",
  "withdrawn",
];

export const OPEN_STAGES: readonly ApplicationStage[] = [
  "applied",
  "screening",
  "assessment",
  "interview",
  "decision",
  "offer",
];

/** An open application whose stage has not changed for longer than this is stale */
export const STALE_APPLICATION_DAYS = 7;

/** Italian label of every stage: the single source of the label text */
export const STAGE_LABELS: Record<ApplicationStage, string> = {
  applied: "Candidato",
  screening: "Screening",
  assessment: "Test",
  interview: "Colloquio",
  decision: "Decisione",
  offer: "Offerta",
  hired: "Assunto",
  rejected: "Scartato",
  withdrawn: "Ritirato",
};

export type StageEvent =
  | "cv_evaluated"
  | "assessment_sent"
  | "interview_scheduled"
  | "all_feedback_submitted"
  | "decision_recorded";

export type DecisionOutcome = "offer" | "hired" | "rejected";

const DAY_MS = 24 * 60 * 60 * 1000;

const toTime = (value: Date | string) =>
  (typeof value === "string" ? new Date(value) : value).getTime();

/** Index in STAGE_ORDER; -1 for the closed stages */
export function stageRank(stage: ApplicationStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function isClosedStage(stage: ApplicationStage): boolean {
  return CLOSED_STAGES.includes(stage);
}

export function isOpenStage(stage: ApplicationStage): boolean {
  return OPEN_STAGES.includes(stage);
}

/**
 * Stage after an automatic event. A closed application never changes, and
 * automation never moves a stage backwards: the caller detects a change by
 * comparing the result with the current stage.
 */
export function advanceStage(
  current: ApplicationStage,
  event: StageEvent,
  outcome?: DecisionOutcome,
): ApplicationStage {
  if (isClosedStage(current)) return current;

  let target: ApplicationStage;
  switch (event) {
    case "cv_evaluated":
      target = "screening";
      break;
    case "assessment_sent":
      target = "assessment";
      break;
    case "interview_scheduled":
      target = "interview";
      break;
    case "all_feedback_submitted":
      target = "decision";
      break;
    case "decision_recorded":
      if (!outcome) {
        throw new Error("decision_recorded requires an outcome");
      }
      target = outcome;
      break;
  }

  if (target === "rejected") return "rejected";

  return stageRank(target) > stageRank(current) ? target : current;
}

/** The following stage of the open path; null for hired and the closed stages */
export function nextStage(stage: ApplicationStage): ApplicationStage | null {
  const rank = stageRank(stage);
  if (rank < 0 || rank >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[rank + 1];
}

/**
 * The application shown for a candidate: the furthest one on the open path
 * (ties: the most recent stage change); when none is on that path, the most
 * recent rejected one, then the most recent withdrawn one.
 */
export function furthestApplication<
  T extends { stage: ApplicationStage; stageChangedAt: Date | string },
>(applications: readonly T[]): T | null {
  const mostRecent = (items: T[]) =>
    items.reduce<T | null>(
      (best, item) =>
        !best || toTime(item.stageChangedAt) > toTime(best.stageChangedAt)
          ? item
          : best,
      null,
    );

  const onPath = applications.filter((a) => stageRank(a.stage) >= 0);
  if (onPath.length > 0) {
    return onPath.reduce((best, item) => {
      const diff = stageRank(item.stage) - stageRank(best.stage);
      if (diff > 0) return item;
      if (
        diff === 0 &&
        toTime(item.stageChangedAt) > toTime(best.stageChangedAt)
      ) {
        return item;
      }
      return best;
    });
  }

  return (
    mostRecent(applications.filter((a) => a.stage === "rejected")) ??
    mostRecent(applications.filter((a) => a.stage === "withdrawn"))
  );
}

/**
 * An open application whose stage changed more than STALE_APPLICATION_DAYS
 * days before `now`. Exactly seven days is not stale.
 */
export function isApplicationStale(
  application: { stage: ApplicationStage; stageChangedAt: Date | string },
  now: Date,
): boolean {
  if (!isOpenStage(application.stage)) return false;
  return (
    now.getTime() - toTime(application.stageChangedAt) >
    STALE_APPLICATION_DAYS * DAY_MS
  );
}

export type KanbanColumnKey =
  | "applied"
  | "screening"
  | "assessment"
  | "interview"
  | "decision"
  | "offer"
  | "hired"
  | "closed";

export const KANBAN_COLUMNS: readonly KanbanColumnKey[] = [
  "applied",
  "screening",
  "assessment",
  "interview",
  "decision",
  "offer",
  "hired",
  "closed",
];

export function kanbanColumnOf(stage: ApplicationStage): KanbanColumnKey {
  return isClosedStage(stage) ? "closed" : (stage as KanbanColumnKey);
}
