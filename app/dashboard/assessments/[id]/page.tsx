import { cn } from "cn";
import { AssessmentExpiryChecker } from "@/components/assessments/assessment-expiry-checker";
import { getAssessmentStatePresentation } from "@/components/assessments/assessment-status";
import { Fact, FactStrip } from "@/components/detail-blocks";
import { Flag, PlayCircle, Timer, User } from "lucide-react";
import PageHeader from "@/components/page-header";
import { AssessmentResults } from "@/components/recruiting/assessment-results";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
// Tabs removed — rendering results directly
import { deleteAssessmentAction } from "@/lib/actions/assessments";
import { getEvaluationByAssessmentId } from "@/lib/data/evaluations";
import {
  getAssessmentDetail,
  getRecentAssessmentIds,
} from "@/lib/data/assessments";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { AssessmentDetailSkeleton } from "./fallbacks";

export async function generateStaticParams() {
  const assessmentIds = await getRecentAssessmentIds(100);

  // Cache Components requires at least one result from generateStaticParams
  // Return a placeholder that will result in 404 at runtime if no assessments exist
  if (assessmentIds.length === 0) {
    return [{ id: "placeholder" }];
  }

  return assessmentIds.map((id) => ({ id }));
}

// Calculate duration helper - only computes when both dates are available
function calculateDuration(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationMs = end.getTime() - start.getTime();
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

type AssessmentDetailParams = Promise<{ id: string }>;

/**
 * Static shell: `params` is only read inside the Suspense boundary, so the
 * route can navigate instantly and stream the assessment in.
 */
export default function AssessmentDetailPage({
  params,
}: {
  params: AssessmentDetailParams;
}) {
  return (
    <Suspense fallback={<AssessmentDetailSkeleton />}>
      <AssessmentDetailContent params={params} />
    </Suspense>
  );
}

async function AssessmentDetailContent({
  params,
}: {
  params: AssessmentDetailParams;
}) {
  const unwrappedParams = await params;
  const [assessmentData, evaluation] = await Promise.all([
    getAssessmentDetail(unwrappedParams.id),
    getEvaluationByAssessmentId(unwrappedParams.id),
  ]);

  if (!assessmentData) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Test non trovato</p>
        <Link
          href="/dashboard/quizzes"
          className={cn("mt-4", buttonVariants({ variant: "default" }))}
        >
          Torna ai quiz
        </Link>
      </div>
    );
  }

  const { assessment, quiz, candidate, applicationId } = assessmentData;
  const statusPresentation = getAssessmentStatePresentation(assessment.status);

  return (
    <div className="flex flex-col gap-6">
      {/* Client-side expiry checker - only triggers for in_progress assessments */}
      <AssessmentExpiryChecker
        assessmentId={assessment.id}
        status={assessment.status}
        startedAt={assessment.startedAt}
        timeLimit={quiz.timeLimit}
      />
      <PageHeader
        title={`Test: ${quiz.title}`}
        info={
          <>
            <Badge variant="outline">
              {quiz.positions?.title ?? "Senza ruolo"}
            </Badge>
            <Badge className={statusPresentation.badge}>
              {statusPresentation.label}
            </Badge>
          </>
        }
        actionBtns={
          <>
            <Link
              href={`/dashboard/applications/${applicationId}` as never}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Vai alla candidatura
            </Link>
            <DeleteWithConfirm
              deleteAction={async () => {
                "use server";
                return deleteAssessmentAction(assessment.id);
              }}
              title="Eliminare il test?"
              description="Questa azione eliminerà permanentemente il test e tutte le risposte associate. L'azione non può essere annullata."
              label="Elimina test"
              successMessage="Test eliminato con successo"
              errorMessage="Errore durante l'eliminazione del test"
              disabled={assessment.status === "completed"}
            />
          </>
        }
      />
      <FactStrip>
        <Fact icon={User} label="Candidato">
          {candidate.name ?? "Nome non disponibile"}
          <span className="block font-normal text-muted-foreground text-xs break-all">
            {candidate.email ?? "Email non disponibile"}
          </span>
        </Fact>
        <Fact icon={PlayCircle} label="Inizio">
          {formatDate(assessment.startedAt, true)}
        </Fact>
        <Fact icon={Flag} label="Fine">
          {formatDate(assessment.completedAt, true)}
        </Fact>
        <Fact icon={Timer} label="Durata">
          {calculateDuration(assessment.startedAt, assessment.completedAt) ??
            (assessment.status === "in_progress" ? "In corso" : "N/A")}
          {quiz.timeLimit ? (
            <span className="block font-normal text-muted-foreground text-xs">
              su {quiz.timeLimit} minuti
            </span>
          ) : null}
        </Fact>
      </FactStrip>

      <div className="flex flex-col gap-4">
        {assessment.status === "completed" ? (
          <AssessmentResults
            assessmentId={assessment.id}
            quizQuestions={quiz.questions}
            answers={assessment.answers || {}}
            candidateName={candidate.name ?? ""}
            initialEvaluation={evaluation}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Risultati non disponibili</CardTitle>
              <CardDescription>
                Il test non è ancora stato completato
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                I risultati saranno disponibili una volta che il candidato avrà
                completato il test.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
