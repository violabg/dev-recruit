import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApplicationDecision } from "@/lib/services/application-decisions";
import type { DecisionScore } from "@/lib/utils/decision-score";
import { cn } from "cn";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import Link from "next/link";
import { DECISION_OUTCOME_LABEL } from "./decision-presentation";

export type DecisionSummaryCardProps = {
  applicationId: string;
  recorded: ApplicationDecision["recorded"];
  score: DecisionScore;
  /** The viewer still has to submit a scorecard: score and warnings hidden */
  scoreHidden: boolean;
};

/** Compact decision summary of the Decisione tab */
export function DecisionSummaryCard({
  applicationId,
  recorded,
  score,
  scoreHidden,
}: DecisionSummaryCardProps) {
  const decidedOn = recorded.decidedAt
    ? format(recorded.decidedAt, "dd/MM/yyyy", { locale: it })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decisione</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="font-medium">
          {recorded.outcome ? (
            <>
              Decisione: {DECISION_OUTCOME_LABEL[recorded.outcome]}
              {recorded.decidedBy && ` · ${recorded.decidedBy.name}`}
              {decidedOn && ` · ${decidedOn}`}
            </>
          ) : (
            "Da decidere"
          )}
        </p>

        {scoreHidden ? (
          <p className="text-muted-foreground text-sm">
            Visibile dopo l&apos;invio del tuo feedback
          </p>
        ) : (
          <>
            <p className="text-sm">
              Punteggio complessivo:{" "}
              <span className="font-semibold tabular-nums">
                {score.overall !== null ? `${score.overall}/5` : "Nessuna prova"}
              </span>
            </p>
            {score.warnings.length > 0 && (
              <p className="bg-warning/10 px-3 py-2 rounded-md w-fit text-warning text-sm">
                {score.warnings.length} criteri indispensabili da motivare
              </p>
            )}
          </>
        )}

        <div>
          <Link
            href={`/dashboard/applications/${applicationId}/decision` as never}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex")}
          >
            Apri la decisione
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
