import { NextActionCard } from "@/components/applications/next-action-card";
import { getApplicationDetail } from "@/lib/data/applications";
import {
  allFeedbackSubmitted,
  toNextActionInterviewFacts,
} from "@/lib/utils/interview-status";
import { getNextAction, type ApplicationFacts } from "@/lib/utils/next-action";

type Props = {
  params: Promise<{ id: string }>;
  /**
   * false when the stop body itself holds the action: the callout shows only
   * the title and description
   */
  showAction?: boolean;
};

/** Computes the next action of the application on the server. */
export async function NextActionSection({ params, showAction = true }: Props) {
  const { id } = await params;
  const detail = await getApplicationDetail(id);

  if (!detail) {
    return null;
  }

  const interviews = detail.interviews.map((interview) => ({
    id: interview.id,
    status: interview.status,
    kitStatus: interview.kitStatus,
    participantIds: interview.participantIds,
    submittedInterviewerIds: interview.submittedInterviewerIds,
  }));

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
    interviews: toNextActionInterviewFacts(interviews),
    allFeedbackSubmitted: allFeedbackSubmitted(interviews),
  };

  return (
    <NextActionCard
      applicationId={detail.id}
      action={getNextAction(facts)}
      candidateEditHref={`/dashboard/candidates/${detail.candidate.id}/edit`}
      showAction={showAction}
    />
  );
}
