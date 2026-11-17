import { InterviewCardActions } from "@/components/interviews/interview-card-actions";
import { InterviewInvitePanel } from "@/components/interviews/interview-invite-panel";
import {
  getInterviewStatusPresentation,
  KIT_STATUS_PRESENTATION,
  PARTICIPANT_ROLE_LABEL,
} from "@/components/interviews/interview-presentation";
import { KitView } from "@/components/interviews/kit-view";
import { LegalReminder } from "@/components/interviews/legal-reminder";
import PageHeader from "@/components/page-header";
import { FieldSkeleton, PageHeaderSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getInterviewForPreparation } from "@/lib/data/interviews";
import { getUserOptions } from "@/lib/data/users";
import { formatInterviewDateTime } from "@/lib/utils/interview-calendar";
import { cn } from "cn";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  type LucideIcon,
  NotebookPen,
  Pencil,
  Radio,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";

type PrepareParams = Promise<{ id: string; interviewId: string }>;
type PrepareSearchParams = Promise<{ scheduled?: string }>;

export async function generateStaticParams() {
  // Cache Components requires at least one result from generateStaticParams
  return [{ id: "placeholder", interviewId: "placeholder" }];
}

/**
 * Read-only preparation of an interview: details, invite summary, legal
 * reminder and the kit. The editor is on /prepare/edit.
 */
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
        <FieldSkeleton label="Dettagli colloquio" />
        <FieldSkeleton label="Scaletta" />
        <FieldSkeleton label="Briefing" />
        <FieldSkeleton label="Ipotesi da verificare" />
        <FieldSkeleton label="Domande" />
        <FieldSkeleton label="Checklist" />
      </div>
    </div>
  );
}

function DetailFact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <span className="flex justify-center items-center bg-primary/10 rounded-md size-8 shrink-0 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-muted-foreground text-xs">{label}</span>
        <div className="font-medium text-sm">{children}</div>
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
  const kitStatus = interview.kit
    ? KIT_STATUS_PRESENTATION[interview.kit.status]
    : null;
  const basePath = `/dashboard/applications/${id}/interviews/${interviewId}`;
  const linkClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "inline-flex",
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="applications"
        title="Preparazione colloquio"
        description={`${candidateName} · ${interview.position.title} · Round ${interview.round}`}
        info={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={status.badge}>{status.label}</Badge>
            {kitStatus && (
              <Badge className={kitStatus.badge}>{kitStatus.label}</Badge>
            )}
          </div>
        }
        actionBtns={
          <div className="flex flex-wrap items-center gap-2">
            {interview.kit && interview.status === "scheduled" && (
              <Link
                href={`${basePath}/prepare/edit` as never}
                className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
              >
                <Pencil className="size-4" />
                Modifica kit
              </Link>
            )}
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

      <Card size="sm">
        <CardContent className="gap-4 grid sm:grid-cols-2 xl:grid-cols-4">
          <DetailFact icon={CalendarClock} label="Quando">
            {formatInterviewDateTime(interview.scheduledAt)}
          </DetailFact>
          <DetailFact icon={Clock} label="Durata">
            {interview.durationMinutes} min
          </DetailFact>
          <DetailFact icon={Users} label="Partecipanti">
            <ul className="flex flex-col">
              {interview.participants.map((participant) => (
                <li key={participant.userId}>
                  {participant.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {PARTICIPANT_ROLE_LABEL[participant.role]}
                  </span>
                </li>
              ))}
            </ul>
          </DetailFact>
          <DetailFact icon={Video} label="Link della call">
            {interview.meetingUrl ? (
              <a
                href={interview.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary break-all underline"
              >
                {interview.meetingUrl}
              </a>
            ) : (
              <span className="font-normal text-muted-foreground">
                Non indicato
              </span>
            )}
          </DetailFact>
        </CardContent>
      </Card>

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
        <KitView kit={interview.kit} criteria={interview.criteria} />
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
