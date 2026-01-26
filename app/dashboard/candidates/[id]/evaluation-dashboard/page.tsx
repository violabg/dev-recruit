import PageHeader from "@/components/page-header";
import { BehavioralRubricForm } from "@/components/recruting/behavioral-rubric-form";
import { HiringNotesForm } from "@/components/recruting/hiring-notes-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBehavioralRubricByCandidatePosition } from "@/lib/data/behavioral-rubrics";
import { getCandidateWithDetails } from "@/lib/data/candidates";
import { getLatestInterviewEvaluationByCandidateId } from "@/lib/data/evaluations";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const hiringRecommendationScores: Record<string, number> = {
  strong_yes: 10,
  yes: 8,
  maybe: 6,
  no: 4,
  strong_no: 2,
};

export default async function CandidateEvaluationDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await getCandidateWithDetails(id);

  if (!candidate) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Candidato non trovato</p>
        <Link
          href="/dashboard/candidates"
          className={`mt-4 ${buttonVariants({ variant: "default" })}`}
        >
          Torna ai candidati
        </Link>
      </div>
    );
  }

  const primaryPosition =
    candidate.positions.find((p) => p.isPrimary) ?? candidate.positions[0];
  const positionId = primaryPosition?.positionId;

  const [interviewEvaluation, behavioralRubric] = await Promise.all([
    getLatestInterviewEvaluationByCandidateId(candidate.id),
    positionId
      ? getBehavioralRubricByCandidatePosition(candidate.id, positionId)
      : Promise.resolve(null),
  ]);

  const quizScore = interviewEvaluation?.quizScore
    ? Math.round(interviewEvaluation.quizScore / 10)
    : null;
  const behavioralScore = behavioralRubric
    ? Math.round(
        ((behavioralRubric.communicationScore +
          behavioralRubric.collaborationScore +
          behavioralRubric.problemSolvingScore +
          behavioralRubric.cultureFitScore) /
          4) *
          2,
      )
    : null;
  const hiringScore = interviewEvaluation?.hireRecommendation
    ? (hiringRecommendationScores[interviewEvaluation.hireRecommendation] ??
      null)
    : null;

  const hireRecommendationDefault = (interviewEvaluation?.hireRecommendation ??
    "maybe") as "strong_yes" | "yes" | "maybe" | "no" | "strong_no";

  const weightedScores = [
    quizScore !== null ? { score: quizScore, weight: 0.5 } : null,
    behavioralScore !== null ? { score: behavioralScore, weight: 0.3 } : null,
    hiringScore !== null ? { score: hiringScore, weight: 0.2 } : null,
  ].filter(Boolean) as Array<{ score: number; weight: number }>;

  const overallScore = weightedScores.length
    ? Math.round(
        weightedScores.reduce(
          (acc, item) => acc + item.score * item.weight,
          0,
        ) / weightedScores.reduce((acc, item) => acc + item.weight, 0),
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/candidates/${candidate.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="mr-1 size-4" />
          Torna al candidato
        </Link>
      </div>

      <PageHeader
        title={`Valutazione unificata — ${candidate.firstName} ${candidate.lastName}`}
        description="Riepilogo di quiz tecnico, scenario comportamentale e note del hiring manager"
      />

      <div className="gap-4 grid md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-semibold text-sm">
              Quiz tecnico
            </CardTitle>
          </CardHeader>
          <CardContent className="font-bold text-2xl">
            {quizScore !== null ? `${quizScore}/10` : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-semibold text-sm">
              Scenario comportamentale
            </CardTitle>
          </CardHeader>
          <CardContent className="font-bold text-2xl">
            {behavioralScore !== null ? `${behavioralScore}/10` : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-semibold text-sm">
              Decisione hiring
            </CardTitle>
          </CardHeader>
          <CardContent className="font-bold text-2xl">
            {hiringScore !== null ? `${hiringScore}/10` : "—"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score complessivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-bold text-3xl">
            {overallScore !== null ? `${overallScore}/10` : "—"}
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            Pesi: quiz 50%, scenario 30%, note hiring 20%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiz tecnico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {interviewEvaluation ? (
            <>
              <div className="text-muted-foreground text-sm">
                Quiz: {interviewEvaluation.interview?.quiz?.title ?? "—"}
              </div>
              <div className="text-sm">
                Fit score: {interviewEvaluation.fitScore ?? "—"}/10
              </div>
              <div className="text-sm">
                Quiz score: {interviewEvaluation.quizScore ?? "—"}%
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              Nessuna valutazione tecnica disponibile.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scenario comportamentale</CardTitle>
        </CardHeader>
        <CardContent>
          {positionId ? (
            <BehavioralRubricForm
              candidateId={candidate.id}
              positionId={positionId}
              defaultValues={
                behavioralRubric
                  ? {
                      candidateId: candidate.id,
                      positionId,
                      communicationScore: behavioralRubric.communicationScore,
                      collaborationScore: behavioralRubric.collaborationScore,
                      problemSolvingScore: behavioralRubric.problemSolvingScore,
                      cultureFitScore: behavioralRubric.cultureFitScore,
                      leadershipScore:
                        behavioralRubric.leadershipScore ?? undefined,
                      strengthExamples: behavioralRubric.strengthExamples ?? [],
                      improvementAreas: behavioralRubric.improvementAreas ?? [],
                      overallComments: behavioralRubric.overallComments ?? "",
                    }
                  : undefined
              }
            />
          ) : (
            <p className="text-muted-foreground">
              Nessuna posizione primaria associata.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Note del hiring manager</CardTitle>
        </CardHeader>
        <CardContent>
          {interviewEvaluation ? (
            <HiringNotesForm
              evaluationId={interviewEvaluation.id}
              defaultValues={{
                evaluationId: interviewEvaluation.id,
                interviewNotes: interviewEvaluation.interviewNotes ?? "",
                redFlags: interviewEvaluation.redFlags ?? [],
                standoutMoments: interviewEvaluation.standoutMoments ?? [],
                hireRecommendation: hireRecommendationDefault,
                nextSteps: interviewEvaluation.nextSteps ?? "",
              }}
            />
          ) : (
            <p className="text-muted-foreground">
              Completa un quiz tecnico per aggiungere note del hiring manager.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
