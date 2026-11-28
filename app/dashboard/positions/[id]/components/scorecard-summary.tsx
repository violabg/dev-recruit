import {
  CRITERION_CATEGORY_LABEL,
  CRITERION_PRIORITY_PRESENTATION,
} from "@/components/scorecard/criterion-presentation";
import { ChapterHeader, Stat, StatGrid } from "@/components/detail-blocks";
import { AnswerAnchors, hasAnchors } from "@/components/interviews/kit-blocks";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getScorecardByPositionId } from "@/lib/data/scorecards";
import type { CriterionCategory } from "@/lib/schemas";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
  /** This section holds the page's next step: its creation link is primary */
  primary?: boolean;
};

const CATEGORY_ORDER: CriterionCategory[] = ["technical", "soft", "culture"];

/**
 * Tab "Criteri": the active criteria of the scorecard, grouped
 * by category, read-only. Archived criteria are not shown here.
 */
export async function ScorecardSummary({ params, primary = false }: Props) {
  const { id } = await params;
  const scorecard = await getScorecardByPositionId(id);
  const criteria = scorecard?.criteria ?? [];
  const editorHref = `/dashboard/positions/${id}/scorecard` as const;

  if (criteria.length === 0) {
    return (
      <section className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">
          Criteri della posizione
        </h2>
        <span className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
          Nessun criterio.
          <Link
            href={editorHref}
            className={buttonVariants({
              variant: primary ? "default" : "outline",
              size: "sm",
            })}
          >
            <Plus className="mr-1 size-4" />
            Aggiungi i criteri
          </Link>
        </span>
      </section>
    );
  }

  const mustCount = criteria.filter((c) => c.priority === "must").length;
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    group: criteria.filter((criterion) => criterion.category === category),
  })).filter(({ group }) => group.length > 0);

  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">
          Criteri della posizione
        </h2>
        <Link
          href={editorHref}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil className="mr-1 size-4" />
          Modifica i criteri
        </Link>
      </div>

      <Card size="sm">
        <CardContent>
          <StatGrid>
            <Stat value={criteria.length} label="criteri" />
            <Stat value={mustCount} label="indispensabili" />
            <Stat
              value={criteria.filter((c) => hasAnchors(c.anchors)).length}
              label="con risposte attese"
            />
            <Stat
value={groups.length}
              label="categorie"
            />
          </StatGrid>
        </CardContent>
      </Card>

      {groups.map(({ category, group }, groupIndex) => {
        const number = groupIndex + 1;
        return (
          <section key={category} className="flex flex-col gap-3">
            <ChapterHeader
              number={number}
              title={CRITERION_CATEGORY_LABEL[category]}
              meta={`${group.length} ${group.length === 1 ? "criterio" : "criteri"}`}
            />
            {group.map((criterion, index) => {
              const priority =
                CRITERION_PRIORITY_PRESENTATION[criterion.priority];
              return (
                <Card
                  key={criterion.id}
                  className={cn(
                    criterion.priority === "must" && "ring-primary/40",
                  )}
                >
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="font-display font-bold text-muted-foreground text-sm tabular-nums">
                        {number}.{index + 1}
                      </span>
                      <span className="font-semibold text-base">
                        {criterion.name}
                      </span>
                      <Badge className={priority.className}>
                        {priority.label}
                      </Badge>
                      <span className="ml-auto text-muted-foreground text-xs tabular-nums">
                        Peso {criterion.weight}/5 · Livello atteso{" "}
                        {criterion.expectedLevel}/5
                      </span>
                    </div>
                    {criterion.description && (
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {criterion.description}
                      </p>
                    )}
                    {hasAnchors(criterion.anchors) && (
                      <AnswerAnchors anchors={criterion.anchors} />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
