import { InterviewCardActions } from "@/components/interviews/interview-card-actions";
import {
  getInterviewStatusPresentation,
  KIT_STATUS_PRESENTATION,
} from "@/components/interviews/interview-presentation";
import { KitEditor } from "@/components/interviews/kit-editor";
import { LegalReminder } from "@/components/interviews/legal-reminder";
import PageHeader from "@/components/page-header";
import { FieldSkeleton, PageHeaderSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { getInterviewForPreparation } from "@/lib/data/interviews";
import { getUserOptions } from "@/lib/data/users";
import { interviewTrail } from "@/lib/utils/breadcrumbs";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

type EditPrepareParams = Promise<{ id: string; interviewId: string }>;

/** Editor of the interview kit: only a scheduled interview can be changed. */
export default function EditPreparePage({
  params,
}: {
  params: EditPrepareParams;
}) {
  return (
    <Suspense fallback={<EditPrepareSkeleton />}>
      <EditPrepareContent params={params} />
    </Suspense>
  );
}

function EditPrepareSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton description />
      <div className="flex flex-col gap-4">
        <FieldSkeleton label="Briefing" />
        <FieldSkeleton label="Ipotesi da verificare" />
        <FieldSkeleton label="Domande" />
        <FieldSkeleton label="Checklist" />
      </div>
    </div>
  );
}

async function EditPrepareContent({ params }: { params: EditPrepareParams }) {
  const { id, interviewId } = await params;

  const interview = await getInterviewForPreparation(interviewId);
  if (!interview || interview.applicationId !== id) {
    notFound();
  }

  const basePath = `/dashboard/applications/${id}/interviews/${interviewId}`;
  // A completed or cancelled interview keeps its kit read-only
  const editable = interview.status === "scheduled";
  if (!editable || !interview.kit) {
    redirect(`${basePath}/prepare` as never);
  }

  const users = await getUserOptions();
  const candidateName =
    `${interview.candidate.firstName} ${interview.candidate.lastName}`.trim();
  const status = getInterviewStatusPresentation(interview.status);
  const kitStatus = KIT_STATUS_PRESENTATION[interview.kit.status];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Modifica la preparazione"
        description={`${candidateName} · ${interview.position.title} · Round ${interview.round}`}
        breadcrumbs={interviewTrail(
          { id, candidateName, position: interview.position },
          interview,
          "Modifica preparazione",
        )}
        info={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={status.badge}>{status.label}</Badge>
            <span className="text-muted-foreground text-sm">
              {kitStatus.label}
            </span>
          </div>
        }
        actionBtns={
          <div className="flex flex-wrap items-center gap-2">
            <InterviewCardActions
              interview={{
                id: interview.id,
                scheduledAt: interview.scheduledAt,
                durationMinutes: interview.durationMinutes,
                meetingUrl: interview.meetingUrl,
                participants: interview.participants.map((participant) => ({
                  userId: participant.userId,
                  role: participant.role,
                })),
              }}
              status={interview.status}
              users={users}
            />
          </div>
        }
      />

      <LegalReminder />

      <KitEditor
        interviewId={interview.id}
        applicationId={id}
        editable={editable}
        kit={interview.kit}
        criteria={interview.criteria}
      />
    </div>
  );
}
