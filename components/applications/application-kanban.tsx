import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ApplicationCard } from "@/lib/data/applications";
import {
  KANBAN_COLUMNS,
  kanbanColumnOf,
  type KanbanColumnKey,
} from "@/lib/utils/application-stage";
import { cn } from "cn";
import { UserRound } from "lucide-react";
import Link from "next/link";
import {
  APPLICATION_STAGE_PRESENTATION,
  KANBAN_COLUMN_LABEL,
} from "./application-stage";
import { ApplicationStageBadge } from "./application-stage-badge";
import { MoveStageMenu } from "./move-stage-menu";

/** Dot of a column: the stage colour, muted for the closed column */
const columnDot = (key: KanbanColumnKey) =>
  key === "closed" ? "bg-muted-foreground" : APPLICATION_STAGE_PRESENTATION[key].dot;

/**
 * Applications of a position grouped by stage: seven columns from applied to
 * hired plus "Chiuse" for rejected and withdrawn. Cards keep the order they
 * are received in (most recent stage change first). No drag and drop: the
 * stage is moved with the menu of each card.
 */
export function ApplicationKanban({
  applications,
}: {
  applications: ApplicationCard[];
}) {
  const columns = new Map<KanbanColumnKey, ApplicationCard[]>(
    KANBAN_COLUMNS.map((key) => [key, []]),
  );
  for (const application of applications) {
    columns.get(kanbanColumnOf(application.stage))?.push(application);
  }

  return (
    <div className="flex gap-4 pb-2 overflow-x-auto">
      {KANBAN_COLUMNS.map((key) => {
        const cards = columns.get(key) ?? [];

        return (
          <section
            key={key}
            aria-label={KANBAN_COLUMN_LABEL[key]}
            className="flex flex-col gap-3 min-w-56 shrink-0"
          >
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <span
                aria-hidden
                className={cn("rounded-full size-2", columnDot(key))}
              />
              {KANBAN_COLUMN_LABEL[key]}
              <span className="text-muted-foreground tabular-nums">
                {cards.length}
              </span>
            </h3>

            {cards.length === 0 ? (
              <div className="flex justify-center items-center px-3 py-6 border border-dashed rounded-lg text-muted-foreground text-xs text-center">
                Nessuna candidatura
              </div>
            ) : (
              cards.map((card) => (
                <Card key={card.id} className="py-3">
                  <CardContent className="flex flex-col gap-2 px-3">
                    <Link
                      href={`/dashboard/applications/${card.id}` as never}
                      className="font-medium hover:underline"
                    >
                      {`${card.candidate.firstName} ${card.candidate.lastName}`.trim()}
                    </Link>
                    <span className="text-muted-foreground text-xs truncate">
                      {card.candidate.email}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {key === "closed" && (
                        <ApplicationStageBadge stage={card.stage} />
                      )}
                      {card.candidate.doNotContact && (
                        <Badge className="bg-destructive/10 text-destructive">
                          Non ricontattare
                        </Badge>
                      )}
                      {card.assessmentCount > 0 && (
                        <Badge variant="outline">
                          {card.assessmentCount} test
                        </Badge>
                      )}
                    </div>
                    {card.owner && (
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <UserRound className="size-3" />
                        {card.owner.name}
                      </span>
                    )}
                    <MoveStageMenu applicationId={card.id} stage={card.stage} />
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
