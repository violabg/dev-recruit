import { SendAssessmentForm } from "@/components/applications/send-assessment-form";
import { InvitesList } from "@/components/recruiting/invites-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssignedAssessment } from "@/lib/data/assessments";
import { getApplicationDetail } from "@/lib/data/applications";
import { isClosedStage } from "@/lib/utils/application-stage";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

/** Tab Test: send a quiz of the position and follow the tests sent. */
export async function AssessmentsTab({ params }: Props) {
  const { id } = await params;
  const detail = await getApplicationDetail(id);

  if (!detail) {
    return null;
  }

  const { candidate, position } = detail;
  const candidateName = `${candidate.firstName} ${candidate.lastName}`.trim();

  const assignedAssessments: AssignedAssessment[] = detail.assessments.map(
    (assessment) => ({
      id: assessment.id,
      token: assessment.token,
      status: assessment.status,
      createdAt: new Date(assessment.createdAt).toISOString(),
      startedAt: assessment.startedAt
        ? new Date(assessment.startedAt).toISOString()
        : null,
      completedAt: assessment.completedAt
        ? new Date(assessment.completedAt).toISOString()
        : null,
      applicationId: detail.id,
      candidateId: candidate.id,
      candidateName,
      candidateEmail: candidate.email,
      quizId: assessment.quiz.id,
      quizTitle: assessment.quiz.title,
      quizTimeLimit: assessment.quiz.timeLimit,
    }),
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Invia test</CardTitle>
        </CardHeader>
        <CardContent>
          {isClosedStage(detail.stage) ? (
            <p className="text-muted-foreground text-sm">
              La candidatura è chiusa
            </p>
          ) : detail.availableQuizzes.length === 0 ? (
            <div className="flex flex-col items-start gap-2 text-sm">
              <p className="text-muted-foreground">
                Nessun quiz disponibile per questa posizione
              </p>
              <Link
                href={`/dashboard/positions/${position.id}/quiz/new`}
                className="font-medium text-primary hover:underline"
              >
                Crea un quiz
              </Link>
            </div>
          ) : (
            <SendAssessmentForm
              candidateId={candidate.id}
              availableQuizzes={detail.availableQuizzes.map((quiz) => ({
                id: quiz.id,
                title: quiz.title,
                timeLimit: quiz.timeLimit,
              }))}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test inviati</CardTitle>
        </CardHeader>
        <CardContent>
          <InvitesList assignedAssessments={assignedAssessments} />
        </CardContent>
      </Card>
    </>
  );
}
