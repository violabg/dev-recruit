import { HIRE_RECOMMENDATION_LABEL } from "@/components/interviews/interview-presentation";
import { CRITERION_PRIORITY_PRESENTATION } from "@/components/scorecard/criterion-presentation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HireRecommendation } from "@/lib/schemas";
import type { ApplicationDecision } from "@/lib/services/application-decisions";
import { mean, type DecisionScore } from "@/lib/utils/decision-score";
import { cn } from "cn";
import {
  DecisionCollapsible,
  DecisionInterviewColumnsToggle,
} from "./decision-interview-columns-toggle";
import { scoreTintClass } from "./decision-presentation";

export type DecisionMatrixProps = {
  decision: ApplicationDecision;
  score: DecisionScore;
  collapsedInterviewIds: string[];
};

const STICKY_CELL = "sticky left-0 z-10 bg-background";

function recommendationLabel(value: string | null): string {
  if (value === null) return "Nessuna raccomandazione";
  return (
    HIRE_RECOMMENDATION_LABEL[value as HireRecommendation] ??
    "Nessuna raccomandazione"
  );
}

/** A 1-5 value tinted against the expected level, or 'Nessuna prova' */
function ScoreValue({
  value,
  expectedLevel,
  detail,
}: {
  value: number | null;
  expectedLevel: number;
  detail?: string | null;
}) {
  if (value === null) {
    return (
      <span className="inline-block bg-warning/10 px-2 py-0.5 rounded-md text-warning text-xs">
        Nessuna prova
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "inline-block w-fit px-2 py-0.5 rounded-md font-medium tabular-nums",
          scoreTintClass(value, expectedLevel),
        )}
      >
        {value}/5
      </span>
      {detail && (
        <span
          className="max-w-48 text-muted-foreground text-xs line-clamp-3"
          title={detail}
        >
          {detail}
        </span>
      )}
    </div>
  );
}

/**
 * Criteria x sources matrix of the Decision page: CV, Test, every interview
 * (mean of its interviewers plus one column per submitted scorecard), the
 * combined value and the weight. Cells without evidence are highlighted.
 * Rendered inside the DecisionColumnsProvider owned by the page.
 */
export function DecisionMatrix({
  decision,
  score,
  collapsedInterviewIds,
}: DecisionMatrixProps) {
  const sourcesById = new Map(
    decision.sources.map((source) => [source.criterionId, source]),
  );
  const interviews = decision.interviews.filter(
    (interview) => interview.scorecards.length > 0,
  );
  const collapsed = new Set(collapsedInterviewIds);

  return (
    <div className="flex flex-col gap-3">
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2} className={cn(STICKY_CELL, "bg-muted")}>
                Criterio
              </TableHead>
              <TableHead rowSpan={2}>CV</TableHead>
              <TableHead rowSpan={2}>
                <div className="flex flex-col">
                  <span>Test</span>
                  {decision.test && (
                    <span className="font-normal text-muted-foreground text-xs">
                      {decision.test.quizTitle}
                    </span>
                  )}
                </div>
              </TableHead>
              {interviews.map((interview) => (
                <TableHead
                  key={interview.id}
                  colSpan={interview.scorecards.length + 1}
                  className="text-center align-top"
                >
                  <div className="flex flex-col items-center">
                    <span>Colloquio {interview.round}</span>
                    {collapsed.has(interview.id) && (
                      <DecisionInterviewColumnsToggle
                        interviewId={interview.id}
                        round={interview.round}
                        feedbackHref={`/dashboard/applications/${decision.id}/interviews/${interview.id}/feedback`}
                      />
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead rowSpan={2}>Valore</TableHead>
              <TableHead rowSpan={2}>Peso</TableHead>
            </TableRow>
            <TableRow>
              {interviews.flatMap((interview) => [
                <TableHead key={`${interview.id}-mean`}>Media</TableHead>,
                ...interview.scorecards.map((scorecard) => (
                  <TableHead key={scorecard.feedbackId}>
                    <DecisionCollapsible interviewIds={[interview.id]}>
                      <div className="flex flex-col">
                        <span>{scorecard.interviewerName}</span>
                        <span className="font-normal text-muted-foreground text-xs">
                          {recommendationLabel(scorecard.hireRecommendation)}
                        </span>
                      </div>
                    </DecisionCollapsible>
                  </TableHead>
                )),
              ])}
            </TableRow>
          </TableHeader>
          <TableBody>
            {score.rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={
                    5 +
                    interviews.reduce(
                      (count, interview) =>
                        count + interview.scorecards.length + 1,
                      0,
                    )
                  }
                  className="text-muted-foreground text-center"
                >
                  La posizione non ha criteri
                </TableCell>
              </TableRow>
            )}
            {score.rows.map((row) => {
              const { criterion } = row;
              const source = sourcesById.get(criterion.id);
              const priority = CRITERION_PRIORITY_PRESENTATION[criterion.priority];

              return (
                <TableRow key={criterion.id}>
                  <TableCell className={cn(STICKY_CELL, "align-top")}>
                    <div className="flex flex-col gap-1 min-w-40">
                      <span className="font-medium">
                        {criterion.name}
                        {criterion.archived && " (archiviato)"}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge className={priority.className}>
                          {priority.label}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          atteso {criterion.expectedLevel}
                        </span>
                        {row.disagreement && (
                          <Badge className="bg-warning/10 text-warning">
                            Disaccordo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <ScoreValue
                      value={row.cv}
                      expectedLevel={criterion.expectedLevel}
                      detail={source?.cv?.evidence}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <ScoreValue
                      value={row.test}
                      expectedLevel={criterion.expectedLevel}
                      detail={
                        source?.test
                          ? `${source.test.questionCount} ${source.test.questionCount === 1 ? "domanda" : "domande"}`
                          : null
                      }
                    />
                  </TableCell>
                  {interviews.flatMap((interview) => {
                    const scores = (source?.interviewers ?? []).filter(
                      (entry) => entry.interviewId === interview.id,
                    );
                    const interviewMean = mean(
                      scores.map((entry) => entry.score),
                    );

                    return [
                      <TableCell
                        key={`${interview.id}-mean`}
                        className="align-top"
                      >
                        <DecisionCollapsible interviewIds={[interview.id]}>
                          <ScoreValue
                            value={interviewMean}
                            expectedLevel={criterion.expectedLevel}
                          />
                        </DecisionCollapsible>
                      </TableCell>,
                      ...interview.scorecards.map((scorecard) => {
                        const entry = scores.find(
                          (item) => item.feedbackId === scorecard.feedbackId,
                        );
                        return (
                          <TableCell
                            key={scorecard.feedbackId}
                            className="align-top"
                          >
                            <DecisionCollapsible interviewIds={[interview.id]}>
                              <ScoreValue
                                value={entry?.score ?? null}
                                expectedLevel={criterion.expectedLevel}
                                detail={entry?.evidence}
                              />
                            </DecisionCollapsible>
                          </TableCell>
                        );
                      }),
                    ];
                  })}
                  <TableCell className="align-top">
                    <DecisionCollapsible interviewIds={collapsedInterviewIds}>
                      <ScoreValue
                        value={row.value}
                        expectedLevel={criterion.expectedLevel}
                      />
                    </DecisionCollapsible>
                  </TableCell>
                  <TableCell className="tabular-nums align-top">
                    {row.weight ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {((decision.cv && !decision.cv.perCriterion) ||
        (decision.test && !decision.test.perCriterion) ||
        decision.test?.answerDetailMissing) && (
        <div className="flex flex-col gap-1 text-sm">
          {decision.cv && !decision.cv.perCriterion && (
            <p>
              Punteggio globale CV: {decision.cv.global}/5{" "}
              <span className="text-muted-foreground">
                (non incluso nella media)
              </span>
            </p>
          )}
          {decision.test && !decision.test.perCriterion && (
            <p>
              Punteggio globale Test inviato:{" "}
              {decision.test.global !== null
                ? `${decision.test.global}/5`
                : "—"}{" "}
              <span className="text-muted-foreground">
                (non incluso nella media)
              </span>
            </p>
          )}
          {decision.test?.answerDetailMissing && (
            <p className="text-muted-foreground">
              Dettaglio risposte del test inviato assente: ricalcolalo dalla
              pagina del test inviato per avere il test per criterio
            </p>
          )}
        </div>
      )}
    </div>
  );
}
