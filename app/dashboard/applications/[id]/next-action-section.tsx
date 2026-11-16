import { NextActionCard } from "@/components/applications/next-action-card";
import { getApplicationDetail } from "@/lib/data/applications";
import { getNextAction, type ApplicationFacts } from "@/lib/utils/next-action";

type Props = {
  params: Promise<{ id: string }>;
};

/** Computes the next action of the application on the server. */
export async function NextActionSection({ params }: Props) {
  const { id } = await params;
  const detail = await getApplicationDetail(id);

  if (!detail) {
    return null;
  }

  // Interviews and feedback arrive with Phase 3: omitted here
  const facts: ApplicationFacts = {
    stage: detail.stage,
    hasResume: !!detail.candidate.resumeUrl,
    hasResumeEvaluation: !!detail.resumeEvaluation,
    assessments: detail.assessments.map((assessment) => ({
      id: assessment.id,
      status: assessment.status,
      hasEvaluation: !!assessment.evaluation,
      createdAt: assessment.createdAt,
    })),
  };

  return (
    <NextActionCard
      applicationId={detail.id}
      stage={detail.stage}
      action={getNextAction(facts)}
      candidateEditHref={`/dashboard/candidates/${detail.candidate.id}/edit`}
    />
  );
}
