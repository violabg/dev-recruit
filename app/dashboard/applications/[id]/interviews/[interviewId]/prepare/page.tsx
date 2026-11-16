import { InterviewCardActions } from "@/components/interviews/interview-card-actions";
import { InterviewInvitePanel } from "@/components/interviews/interview-invite-panel";
import { getInterviewStatusPresentation } from "@/components/interviews/interview-presentation";
import { KitEditor } from "@/components/interviews/kit-editor";
import { LegalReminder } from "@/components/interviews/legal-reminder";
import PageHeader from "@/components/page-header";
import { FieldSkeleton, PageHeaderSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getInterviewForPreparation } from "@/lib/data/interviews";
import { getUserOptions } from "@/lib/data/users";
import { cn } from "cn";
import { ArrowLeft, NotebookPen, Radio } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type PrepareParams = Promise<{ id: string; interviewId: string }>;
type PrepareSearchParams = Promise<{ scheduled?: string }>;

export async function generateStaticParams() {
  // Cache Components requires at least one result from generateStaticParams
  return [{ id: "placeholder", interviewId: "placeholder" }];
}

/** Preparation page of an interview: summary, legal reminder and kit editor. */
export default function PrepareInterviewPage({
  params,
  searchParams,
}: {
  params: PrepareParams;
  searchParams: PrepareSearchParams;
}) {
  return (
    <Suspense fallback={<PrepareSkeleton />}>
      <PrepareContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function PrepareSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton section="applications" description />
      <div className="flex flex-col gap-4">
        <FieldSkeleton label="Briefing" />
        <FieldSkeleton label="Ipotesi da verificare" />
        <FieldSkeleton label="Domande" />
      </div>
    </div>
  );
}

async function PrepareContent({
  params,
  searchParams,
}: {
  params: PrepareParams;
  searchParams: PrepareSearchParams;
}) {
  const { id, interviewId } = await params;
  const { scheduled } = await searchParams;

  const interview = await getInterviewForPreparation(interviewId);
  if (!interview || interview.applicationId !== id) {
    notFound();
  }

  const users = await getUserOptions();
  const candidateName =
    `${interview.candidate.firstName} ${interview.candidate.lastName}`.trim();
  const status = getInterviewStatusPresentation(interview.status);
  const basePath = `/dashboard/applications/${id}/interviews/${interviewId}`;
  const linkClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "inline-flex",
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="applications"
        title="Prepara colloquio"
        description={`${candidateName} · ${interview.position.title} · Round ${interview.round}`}
        info={<Badge className={status.badge}>{status.label}</Badge>}
        actionBtns={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/applications/${id}?tab=colloqui` as never}
              className={linkClass}
            >
              <ArrowLeft className="size-4" />
              Candidatura
            </Link>
            <Link href={`${basePath}/live` as never} className={linkClass}>
              <Radio className="size-4" />
              Live
            </Link>
            <Link href={`${basePath}/feedback` as never} className={linkClass}>
              <NotebookPen className="size-4" />
              Scheda
            </Link>
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

      <InterviewInvitePanel
        defaultOpen={scheduled === "1"}
        interviewId={interview.id}
        round={interview.round}
        candidateName={candidateName}
        positionTitle={interview.position.title}
        scheduledAt={interview.scheduledAt}
        durationMinutes={interview.durationMinutes}
        meetingUrl={interview.meetingUrl}
        participants={interview.participants.map((participant) => ({
          name: participant.name,
          role: participant.role,
        }))}
        status={interview.status}
        sequence={interview.sequence}
      />

      <LegalReminder />

      {interview.kit ? (
        <KitEditor
          interviewId={interview.id}
          applicationId={id}
          editable={interview.status === "scheduled"}
          kit={interview.kit}
          criteria={interview.criteria}
        />
      ) : (
        <Empty className="border h-[200px]">
          <EmptyHeader>
            <EmptyTitle>Kit non disponibile</EmptyTitle>
            <EmptyDescription>
              Questo colloquio non ha un kit di preparazione.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
