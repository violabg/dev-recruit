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
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth-server";
import { getApplicationDecision } from "@/lib/data/applications";
import type { ApplicationStage } from "@/lib/schemas";
import { computeDecisionScore } from "@/lib/utils/decision-score";
import { cn } from "cn";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
      <PageHeaderSkeleton section="applications" description />
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="applications"
        title="Decisione"
        description={`${candidateName} · ${decision.position.title}`}
        actionBtns={
          <Link
            href={`/dashboard/applications/${id}` as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="size-4" />
            Torna alla candidatura
          </Link>
        }
      />

      {collapsedInterviewIds.length > 0 && (
        <p className="bg-warning/10 px-3 py-2 rounded-md text-warning text-sm">
          Per un giudizio indipendente, invia prima la tua scheda: punteggio e
          schede degli altri sono nascosti finché non la mostri
        </p>
      )}

      <DecisionColumnsProvider collapsedInterviewIds={collapsedInterviewIds}>
        <Card>
          <CardHeader>
            <CardTitle>Punteggio complessivo</CardTitle>
            <CardDescription>
              {score.weightsSource === "decision" && recorded.decidedAt
                ? `Pesi salvati con la decisione del ${formatDate(recorded.decidedAt)}`
                : "Pesi della scheda di valutazione"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <span className="font-bold text-2xl tabular-nums">
              <DecisionCollapsible
                interviewIds={collapsedInterviewIds}
                placeholder="Visibile dopo l'invio della tua scheda"
              >
                {score.overall !== null ? `${score.overall}/5` : "Nessuna prova"}
              </DecisionCollapsible>
            </span>
            <p className="text-muted-foreground text-sm">
              Media pesata sui soli criteri con prove; CV e test globali non
              inclusi
            </p>
          </CardContent>
        </Card>

        {score.warnings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Criteri indispensabili da motivare</CardTitle>
            </CardHeader>
            <CardContent>
              <DecisionCollapsible
                interviewIds={collapsedInterviewIds}
                placeholder="Visibile dopo l'invio della tua scheda"
              >
                <ul className="flex flex-col gap-1 pl-5 text-warning text-sm list-disc">
                  {score.warnings.map((warning) => (
                    <li key={warning.criterionId}>
                      {mustWarningText(warning)}
                    </li>
                  ))}
                </ul>
              </DecisionCollapsible>
            </CardContent>
          </Card>
        )}

        <DecisionMatrix
          decision={decision}
          score={score}
          collapsedInterviewIds={collapsedInterviewIds}
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
      </DecisionColumnsProvider>

      {recorded.outcome && (
        <Card>
          <CardHeader>
            <CardTitle>Decisione registrata</CardTitle>
            <CardDescription>
              {DECISION_OUTCOME_LABEL[recorded.outcome]}
              {recorded.decidedBy && ` · ${recorded.decidedBy.name}`}
              {recorded.decidedAt && ` · ${formatDate(recorded.decidedAt)}`}
            </CardDescription>
          </CardHeader>
          {recorded.rationale && (
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">
                {recorded.rationale}
              </p>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
