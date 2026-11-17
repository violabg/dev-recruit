import {
  CRITERION_CATEGORY_LABEL,
  CRITERION_PRIORITY_PRESENTATION,
} from "@/components/scorecard/criterion-presentation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getScorecardByPositionId } from "@/lib/data/scorecards";
import type { CriterionCategory } from "@/lib/schemas";
import { ClipboardList, Pencil, Plus } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

const CATEGORY_ORDER: CriterionCategory[] = ["technical", "soft", "culture"];

/**
 * Tab "Scheda di valutazione": the active criteria of the scorecard, grouped
 * by category, read-only. Archived criteria are not shown here.
 */
export async function ScorecardSummary({ params }: Props) {
  const { id } = await params;
  const scorecard = await getScorecardByPositionId(id);
  const criteria = scorecard?.criteria ?? [];
  const editorHref = `/dashboard/positions/${id}/scorecard` as const;

  if (criteria.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyTitle>Nessuna scheda di valutazione</EmptyTitle>
              <EmptyDescription>
                Definisci i criteri con cui valutare i candidati di questa
                posizione.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                href={editorHref}
                className={buttonVariants({ variant: "default", size: "sm" })}
              >
                <Plus className="mr-1 size-4" />
                Crea scheda
              </Link>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-between">
        <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">
          Scheda di valutazione
        </h2>
        <Link
          href={editorHref}
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          <Pencil className="mr-1 size-4" />
          Modifica scheda
        </Link>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const group = criteria.filter(
          (criterion) => criterion.category === category,
        );
        if (group.length === 0) return null;

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">
                {CRITERION_CATEGORY_LABEL[category]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {group.map((criterion) => {
                  const priority =
                    CRITERION_PRIORITY_PRESENTATION[criterion.priority];
                  return (
                    <li
                      key={criterion.id}
                      className="flex flex-col gap-1 pb-3 border-b last:border-b-0"
                    >
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <span className="font-medium">{criterion.name}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={priority.className}>
                            {priority.label}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            Peso {criterion.weight}/5
                          </span>
                          <span className="text-muted-foreground text-xs">
                            Livello atteso {criterion.expectedLevel}/5
                          </span>
                        </div>
                      </div>
                      {criterion.description && (
                        <p className="text-muted-foreground text-sm">
                          {criterion.description}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
