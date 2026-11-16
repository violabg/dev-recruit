import { EvaluationSummaryView } from "@/components/applications/evaluation-summary-view";
import { getApplicationEvaluationSummary } from "@/lib/data/applications";
import { computeEvaluationScore } from "@/lib/utils/evaluation-score";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Tab Decisione: the evaluation dashboard of this application, computed on
 * its tests, its rubric and its hiring decision.
 */
export async function DecisionTab({ params }: Props) {
  const { id } = await params;
  const summary = await getApplicationEvaluationSummary(id);

  if (!summary) {
    return null;
  }

  const score = computeEvaluationScore({
    quizScore: summary.assessmentEvaluation?.quizScore,
    rubric: summary.rubric,
    hireRecommendation: summary.assessmentEvaluation?.hireRecommendation,
  });

  return (
    <EvaluationSummaryView
      candidateId={summary.candidateId}
      positionId={summary.positionId}
      score={score}
      rubric={summary.rubric}
      assessmentEvaluation={summary.assessmentEvaluation}
    />
  );
}
