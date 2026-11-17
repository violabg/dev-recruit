import type { ApplicationStage } from "@/lib/schemas";
import {
  isClosedStage,
  STAGE_ORDER,
  stageRank,
} from "@/lib/utils/application-stage";
import { cn } from "cn";
import { APPLICATION_STAGE_PRESENTATION } from "./application-stage";
import { ApplicationStageBadge } from "./application-stage-badge";

/**
 * Read-only stepper of the open path. Steps before the current one are done,
 * the current one is marked with aria-current; for a closed application every
 * step is muted and the closed stage is shown beside the list.
 */
export function StageStepper({ stage }: { stage: ApplicationStage }) {
  const closed = isClosedStage(stage);
  const currentRank = stageRank(stage);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ol
        aria-label="Fasi della candidatura"
        className="flex flex-wrap items-center gap-x-4 gap-y-2"
      >
        {STAGE_ORDER.map((step, index) => {
          const presentation = APPLICATION_STAGE_PRESENTATION[step];
          const isCurrent = !closed && index === currentRank;
          const isDone = !closed && index < currentRank;

          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 text-sm",
                isCurrent
                  ? "font-medium text-foreground"
                  : isDone
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "rounded-full size-2 shrink-0",
                  isDone || isCurrent ? presentation.dot : "bg-muted",
                )}
              />
              {presentation.label}
            </li>
          );
        })}
      </ol>
      {closed && <ApplicationStageBadge stage={stage} />}
    </div>
  );
}
