import { StationTrack, stationPointer, type Station } from "@/components/flow";
import type { ApplicationStage } from "@/lib/schemas";
import {
  isClosedStage,
  STAGE_ORDER,
  stageRank,
} from "@/lib/utils/application-stage";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { APPLICATION_STAGE_PRESENTATION } from "./application-stage";
import { ApplicationStageBadge } from "./application-stage-badge";

/**
 * The open path of an application as a station track: passed stages green,
 * the current one blue with the day it started (a date, not a clock reading:
 * safe to cache). A closed application shows every station hollow and its
 * closed stage beside the track.
 */
export function StageStepper({
  stage,
  stageChangedAt,
}: {
  stage: ApplicationStage;
  /** When the current stage started: shown under it */
  stageChangedAt?: Date;
}) {
  const closed = isClosedStage(stage);
  const currentRank = stageRank(stage);

  const stations: Station[] = STAGE_ORDER.map((step, index) => ({
    key: step,
    label: APPLICATION_STAGE_PRESENTATION[step].label,
    state: closed
      ? "todo"
      : index < currentRank
        ? "done"
        : index === currentRank
          ? "current"
          : "todo",
    hint:
      !closed && index === currentRank && stageChangedAt
        ? `dal ${format(stageChangedAt, "d MMM", { locale: it })}`
        : undefined,
  }));

  return (
    <div className="flex items-start gap-4">
      <StationTrack
        stations={stations}
        label="Fasi della candidatura"
        className="flex-1 min-w-0"
      />
      {closed && <ApplicationStageBadge stage={stage} className="shrink-0" />}
    </div>
  );
}

/** Notch position for the next action under the current stage, if open. */
export function stagePointer(stage: ApplicationStage): number | undefined {
  if (isClosedStage(stage)) return undefined;
  return stationPointer(stageRank(stage), STAGE_ORDER.length);
}
