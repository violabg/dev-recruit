import { CRITERION_PRIORITY_PRESENTATION } from "@/components/scorecard/criterion-presentation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CriterionCoverage } from "@/lib/utils/interview-feedback";
import { cn } from "cn";

/**
 * Coverage of the scorecard criteria cited by the kit: must first, then
 * scorecard order; criteria with no evidence yet are highlighted.
 */
export function CriteriaCoveragePanel({
  coverage,
}: {
  coverage: CriterionCoverage[];
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Copertura criteri</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {coverage.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nessun criterio citato dalle domande del kit.
          </p>
        )}
        {coverage.map((criterion) => {
          const priority = CRITERION_PRIORITY_PRESENTATION[criterion.priority];
          return (
            <div
              key={criterion.criterionId}
              className="flex flex-col gap-1 pb-3 last:pb-0 border-b last:border-b-0"
            >
              <span className="font-medium text-sm">
                {criterion.name}
                {criterion.archived ? " (archiviato)" : ""}
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge className={priority.className}>{priority.label}</Badge>
                <span className="text-muted-foreground">
                  {criterion.coveredCount}/{criterion.itemCount} coperte
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-md",
                    criterion.hasEvidence
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning",
                  )}
                >
                  {criterion.hasEvidence ? "Con prove" : "Nessuna prova"}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
