import { CRITERION_PRIORITY_PRESENTATION } from "@/components/scorecard/criterion-presentation";
import { Badge } from "@/components/ui/badge";
import type { ApplicationDetail } from "@/lib/data/applications";
import { cn } from "cn";

type CriteriaAssessmentListProps = {
  items: NonNullable<
    NonNullable<ApplicationDetail["resumeEvaluation"]>["criteriaAssessment"]
  >;
};

/**
 * Score chip of one criterion: against the expected level, success when
 * reached, warning when one below, destructive when lower; muted when the
 * CV gives no evidence.
 */
function scoreChip(score: number | null, expectedLevel: number) {
  if (score === null) {
    return {
      label: "Nessuna evidenza nel CV",
      className: "bg-muted text-muted-foreground",
    };
  }
  const className =
    score >= expectedLevel
      ? "bg-success/10 text-success"
      : score === expectedLevel - 1
        ? "bg-warning/10 text-warning"
        : "bg-destructive/10 text-destructive";
  return { label: `${score}/5 · atteso ${expectedLevel}`, className };
}

/** CV assessment per scorecard criterion. */
export function CriteriaAssessmentList({ items }: CriteriaAssessmentListProps) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-medium">Valutazione per criterio</h4>
      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const chip = scoreChip(item.score, item.expectedLevel);
          const priority = CRITERION_PRIORITY_PRESENTATION[item.priority];
          return (
            <li
              key={item.criterionId}
              className="flex flex-col gap-1 pb-3 border-b last:border-b-0"
            >
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {item.name}
                    {item.archived && (
                      <span className="text-muted-foreground">
                        {" "}
                        (archiviato)
                      </span>
                    )}
                  </span>
                  <Badge className={priority.className}>{priority.label}</Badge>
                </div>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full font-medium text-xs",
                    chip.className,
                  )}
                >
                  {chip.label}
                </span>
              </div>
              {item.evidence && (
                <p className="text-muted-foreground text-sm">
                  {item.evidence}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
