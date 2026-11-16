import { BehavioralRubricForm } from "@/components/recruiting/behavioral-rubric-form";
import { HiringNotesForm } from "@/components/recruiting/hiring-notes-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EvaluationScore } from "@/lib/utils/evaluation-score";
import { cn } from "cn";

type HireRecommendation = "strong_yes" | "yes" | "maybe" | "no" | "strong_no";

type EvaluationSummaryRubric = {
  communicationScore: number;
  collaborationScore: number;
  problemSolvingScore: number;
  cultureFitScore: number;
  leadershipScore: number | null;
  strengthExamples: string[];
  improvementAreas: string[];
  overallComments: string | null;
};

type EvaluationSummaryAssessmentEvaluation = {
  id: string;
  interviewNotes: string | null;
  redFlags: string[];
  standoutMoments: string[];
  hireRecommendation: string | null;
  nextSteps: string | null;
};

type EvaluationSummaryViewProps = {
  candidateId: string;
  positionId: string;
  score: EvaluationScore;
  rubric: EvaluationSummaryRubric | null;
  assessmentEvaluation: EvaluationSummaryAssessmentEvaluation | null;
};

const HIRE_RECOMMENDATIONS: readonly HireRecommendation[] = [
  "strong_yes",
  "yes",
  "maybe",
  "no",
  "strong_no",
];

/** Score tint on the 0–10 scale: ≥ 7 success, ≥ 4 warning, else destructive */
function scoreTint(value: number) {
  if (value >= 7) return "bg-success/10 text-success";
  if (value >= 4) return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
}

function ScoreCard({ title, value }: { title: string; value: number | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {value !== null ? (
          <span
            className={cn(
              "inline-block px-2 py-0.5 rounded-md font-bold text-2xl tabular-nums",
              scoreTint(value),
            )}
          >
            {value}/10
          </span>
        ) : (
          <span className="font-bold text-muted-foreground text-2xl">—</span>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Evaluation dashboard of one application: the computed score, the
 * behavioral rubric and the hiring decision. Presentational only: it reads no
 * data and computes no score.
 */
export function EvaluationSummaryView({
  candidateId,
  positionId,
  score,
  rubric,
  assessmentEvaluation,
}: EvaluationSummaryViewProps) {
  const hireRecommendationDefault: HireRecommendation =
    HIRE_RECOMMENDATIONS.find(
      (value) => value === assessmentEvaluation?.hireRecommendation,
    ) ?? "maybe";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="gap-4 grid sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard title="Punteggio complessivo" value={score.overall} />
          <ScoreCard title="Quiz" value={score.quiz} />
          <ScoreCard title="Scenario comportamentale" value={score.behavioral} />
          <ScoreCard title="Decisione hiring" value={score.hiring} />
        </div>
        <p className="text-muted-foreground text-sm">
          Pesi: quiz 50%, scenario 30%, note hiring 20%
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scenario comportamentale</CardTitle>
        </CardHeader>
        <CardContent>
          <BehavioralRubricForm
            candidateId={candidateId}
            positionId={positionId}
            defaultValues={
              rubric
                ? {
                    candidateId,
                    positionId,
                    communicationScore: rubric.communicationScore,
                    collaborationScore: rubric.collaborationScore,
                    problemSolvingScore: rubric.problemSolvingScore,
                    cultureFitScore: rubric.cultureFitScore,
                    leadershipScore: rubric.leadershipScore ?? undefined,
                    strengthExamples: rubric.strengthExamples ?? [],
                    improvementAreas: rubric.improvementAreas ?? [],
                    overallComments: rubric.overallComments ?? "",
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decisione hiring</CardTitle>
        </CardHeader>
        <CardContent>
          {assessmentEvaluation ? (
            <HiringNotesForm
              evaluationId={assessmentEvaluation.id}
              defaultValues={{
                evaluationId: assessmentEvaluation.id,
                interviewNotes: assessmentEvaluation.interviewNotes ?? "",
                redFlags: assessmentEvaluation.redFlags ?? [],
                standoutMoments: assessmentEvaluation.standoutMoments ?? [],
                hireRecommendation: hireRecommendationDefault,
                nextSteps: assessmentEvaluation.nextSteps ?? "",
              }}
            />
          ) : (
            <p className="text-muted-foreground">
              Genera la valutazione di un test per registrare la decisione
              hiring
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
