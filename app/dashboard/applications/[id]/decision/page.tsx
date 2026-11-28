import {
  DecisionCollapsible,
  DecisionColumnsProvider,
} from "@/components/applications/decision/decision-interview-columns-toggle";
import { DecisionMatrix } from "@/components/applications/decision/decision-matrix";
import {
  DECISION_OUTCOME_LABEL,
  mustWarningText,
} from "@/components/applications/decision/decision-presentation";
import { DecisionWorkspace } from "@/components/applications/decision/decision-workspace";
import PageHeader from "@/components/page-header";
import {
  FieldSkeleton,
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import {
  BlockLabel,
  ChapterHeader,
  Stat,
  StatGrid,
} from "@/components/detail-blocks";
import { getCurrentUser } from "@/lib/auth-server";
import { getApplicationDecision } from "@/lib/data/applications";
import type { ApplicationStage } from "@/lib/schemas";
import { applicationTrail } from "@/lib/utils/breadcrumbs";
import { computeDecisionScore } from "@/lib/utils/decision-score";
import { cn } from "cn";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

type DecisionParams = Promise<{ id: string }>;

/** Stages on which the decision can no longer be recorded */
const DECISION_CLOSED_STAGES: ApplicationStage[] = [
  "hired",
  "rejected",
  "withdrawn",
];

export async function generateStaticParams() {
  // Cache Components requires at least one result from generateStaticParams
  return [{ id: "placeholder" }];
}

/** Decision page of an application: matrix, score, form, devil's advocate. */
export default function DecisionPage({ params }: { params: DecisionParams }) {
  return (
    <Suspense fallback={<DecisionSkeleton />}>
      <DecisionContent params={params} />
    </Suspense>
  );
}

function DecisionSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton description />
      <TableSkeleton
        columns={[
          { header: "Criterio", cell: "textBadge" },
          { header: "CV", cell: "badge" },
          { header: "Test", cell: "badge" },
          { header: "Valore", cell: "badge" },
          { header: "Peso", cell: "muted" },
        ]}
      />
      <div className="flex flex-col gap-4">
        <FieldSkeleton label="Esito" />
        <FieldSkeleton label="Motivazione" />
      </div>
    </div>
  );
}

const formatDate = (date: Date) => format(date, "dd/MM/yyyy", { locale: it });

async function DecisionContent({ params }: { params: DecisionParams }) {
  const { id } = await params;
  const decision = await getApplicationDecision(id);
  if (!decision) {
    notFound();
  }

  // Session-dependent view arrangement: read per request
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  // Interviews where the viewer still has to submit a scorecard: their
  // columns start collapsed (view arrangement only, the data is all here)
  const collapsedInterviewIds = decision.interviews
    .filter(
      (interview) =>
        interview.participantIds.includes(user.id) &&
        !interview.submittedInterviewerIds.includes(user.id),
    )
    .map((interview) => interview.id);

  const { recorded } = decision;
  const score = computeDecisionScore({
    criteria: decision.criteria,
    sources: decision.sources,
    decisionWeights: recorded.decidedAt ? recorded.weights : null,
  });

  const candidateName =
    `${decision.candidate.firstName} ${decision.candidate.lastName}`.trim();

  const expectedCount = decision.interviews.reduce(
    (sum, interview) => sum + interview.participantIds.length,
    0,
  );
  const submittedCount = decision.interviews.reduce(
    (sum, interview) => sum + interview.submittedInterviewerIds.length,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Decisione"
        description={`${candidateName} · ${decision.position.title}`}
        breadcrumbs={applicationTrail(
          { id, candidateName, position: decision.position },
          { label: "Decisione" },
        )}
      />

      {recorded.outcome && (
        <div
          className={cn(
            "flex flex-col gap-1 px-4 py-3 border rounded-xl",
            recorded.outcome === "rejected"
              ? "border-destructive/40 bg-destructive/5"
              : "border-success/40 bg-success/5",
          )}
        >
          <span
            className={cn(
              "font-semibold text-xs uppercase tracking-wide",
              recorded.outcome === "rejected"
                ? "text-destructive"
                : "text-success",
            )}
          >
            Decisione registrata
          </span>
          <span className="font-display font-bold text-heading text-xl">
            {DECISION_OUTCOME_LABEL[recorded.outcome]}
          </span>
          <span className="text-muted-foreground text-sm">
            {[
              recorded.decidedBy?.name,
              recorded.decidedAt && formatDate(recorded.decidedAt),
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {recorded.rationale && (
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {recorded.rationale}
            </p>
          )}
        </div>
      )}

      {collapsedInterviewIds.length > 0 && (
        <p className="flex items-start gap-2 bg-warning/10 px-3 py-2 rounded-md text-warning text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Per un giudizio indipendente, invia prima il tuo feedback: punteggio
            e feedback degli altri sono nascosti finché non lo mostri
          </span>
        </p>
      )}

      <DecisionColumnsProvider collapsedInterviewIds={collapsedInterviewIds}>
        {/* At a glance */}
        <Card size="sm">
          <CardContent className="flex flex-col gap-3">
            <StatGrid>
              <Stat
                value={
                  <DecisionCollapsible
                    interviewIds={collapsedInterviewIds}
                    placeholder="Dopo il tuo feedback"
                  >
                    {score.overall !== null ? `${score.overall}/5` : "—"}
                  </DecisionCollapsible>
                }
                label="punteggio complessivo"
              />
              <Stat
                value={`${submittedCount}/${expectedCount}`}
                label="feedback inviati"
                tone={
                  expectedCount > 0 && submittedCount === expectedCount
                    ? "success"
                    : "warning"
                }
              />
              <Stat
                value={decision.interviews.length}
                label={decision.interviews.length === 1 ? "colloquio" : "colloqui"}
              />
              <Stat
                value={
                  <DecisionCollapsible
                    interviewIds={collapsedInterviewIds}
                    placeholder="—"
                  >
                    {score.warnings.length}
                  </DecisionCollapsible>
                }
                label="indispensabili da motivare"
                tone={
                  collapsedInterviewIds.length === 0 && score.warnings.length > 0
                    ? "warning"
                    : undefined
                }
              />
            </StatGrid>
            <p className="text-muted-foreground text-xs">
              Media pesata sui soli criteri con prove; CV e test globali non
              inclusi.{" "}
              {score.weightsSource === "decision" && recorded.decidedAt
                ? `Pesi salvati con la decisione del ${formatDate(recorded.decidedAt)}.`
                : "Pesi dei criteri."}
            </p>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3">
          <ChapterHeader
            number={1}
            title="Prove per criterio"
            meta="CV, test e colloqui a confronto"
          />
          {score.warnings.length > 0 && (
            <DecisionCollapsible
              interviewIds={collapsedInterviewIds}
              placeholder="Avvisi visibili dopo l'invio del tuo feedback"
            >
              <div className="flex flex-col gap-2 bg-warning/10 px-4 py-3 rounded-xl text-warning">
                <BlockLabel>Criteri indispensabili da motivare</BlockLabel>
                <ul className="flex flex-col gap-1 text-sm">
                  {score.warnings.map((warning) => (
                    <li
                      key={warning.criterionId}
                      className="flex items-start gap-2"
                    >
                      <AlertTriangle
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      <span>{mustWarningText(warning)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </DecisionCollapsible>
          )}
          <DecisionMatrix
            decision={decision}
            score={score}
            collapsedInterviewIds={collapsedInterviewIds}
          />
        </section>

        <section className="flex flex-col gap-3">
          <ChapterHeader
            number={2}
            title={recorded.outcome ? "Aggiorna la decisione" : "Registra la decisione"}
            meta="L'avvocato del diavolo argomenta contro l'esito scelto"
          />
          <DecisionWorkspace
            applicationId={id}
            warnings={score.warnings}
            collapsedInterviewIds={collapsedInterviewIds}
            initial={{ outcome: recorded.outcome, rationale: recorded.rationale }}
            disabledReason={
              DECISION_CLOSED_STAGES.includes(decision.stage)
                ? "Candidatura chiusa: riaprila per registrare la decisione"
                : null
            }
            criteriaById={Object.fromEntries(
              decision.criteria.map((criterion) => [criterion.id, criterion.name]),
            )}
          />
        </section>
      </DecisionColumnsProvider>
    </div>
  );
}
