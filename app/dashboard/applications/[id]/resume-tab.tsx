import { ResumeEvaluationPanel } from "@/components/applications/resume-evaluation-panel";
import { getApplicationDetail } from "@/lib/data/applications";
import { resumePublicUrl } from "@/lib/services/r2-storage";

type Props = {
  params: Promise<{ id: string }>;
};

/** Tab CV: the resume evaluation of this application. */
export async function ResumeTab({ params }: Props) {
  const { id } = await params;
  const detail = await getApplicationDetail(id);

  if (!detail) {
    return null;
  }

  return (
    <ResumeEvaluationPanel
      candidateId={detail.candidate.id}
      positionId={detail.position.id}
      positionTitle={detail.position.title}
      hasResume={!!detail.candidate.resumeUrl}
      resumeUrl={
        detail.candidate.resumeUrl
          ? resumePublicUrl(detail.candidate.resumeUrl)
          : null
      }
      evaluation={detail.resumeEvaluation}
    />
  );
}
