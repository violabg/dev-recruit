import { SendAssessmentForm } from "@/components/applications/send-assessment-form";
import { InvitesList } from "@/components/recruiting/invites-list";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssignedAssessment } from "@/lib/data/assessments";
import { getApplicationDetail } from "@/lib/data/applications";
import { isClosedStage } from "@/lib/utils/application-stage";
import { cn } from "cn";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
  /** The stop holds the next action: its submit button is the single primary */
  primaryAction?: boolean;
};

type TestStopProps = {
  params: Promise<{ id: string }>;
  assessmentId: string;
};

/** Test stop body: the send test and its result. */
export async function TestStopBody({ params, assessmentId }: TestStopProps) {
  const { id } = await params;
  const detail = await getApplicationDetail(id);

  if (!detail) {
    return null;
  }

  const { candidate } = detail;
  const candidateName = `${candidate.firstName} ${candidate.lastName}`.trim();

  const assignedAssessments: AssignedAssessment[] = detail.assessments
    .filter((assessment) => assessment.id === assessmentId)
    .map((assessment) => ({
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
    }));

  return <InvitesList assignedAssessments={assignedAssessments} />;
}

/** Pending Test stop body: send a test of the position. */
export async function SendTestBody({ params, primaryAction = false }: Props) {
  const { id } = await params;
  const detail = await getApplicationDetail(id);

  if (!detail) {
    return null;
  }

  const { candidate, position } = detail;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invia un test</CardTitle>
      </CardHeader>
      <CardContent>
        {isClosedStage(detail.stage) ? (
          <p className="text-muted-foreground text-sm">
            La candidatura è chiusa
          </p>
        ) : detail.availableQuizzes.length === 0 ? (
          <p className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
            Nessun test disponibile per questa posizione
            <Link
              href={`/dashboard/positions/${position.id}/quiz/new` as never}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "inline-flex",
              )}
            >
              Crea un test
            </Link>
          </p>
        ) : (
          <SendAssessmentForm
            candidateId={candidate.id}
            availableQuizzes={detail.availableQuizzes.map((quiz) => ({
              id: quiz.id,
              title: quiz.title,
              timeLimit: quiz.timeLimit,
            }))}
            primaryAction={primaryAction}
          />
        )}
      </CardContent>
    </Card>
  );
}
