import { InterviewCardActions } from "@/components/interviews/interview-card-actions";
import { InterviewInvitePanel } from "@/components/interviews/interview-invite-panel";
import {
  getInterviewStatusPresentation,
  KIT_STATUS_PRESENTATION,
  PARTICIPANT_ROLE_LABEL,
} from "@/components/interviews/interview-presentation";
import { KitReadyButton } from "@/components/interviews/kit-ready-button";
import { KitView } from "@/components/interviews/kit-view";
import { LegalReminder } from "@/components/interviews/legal-reminder";
import { Fact, FactStrip, NextStep } from "@/components/detail-blocks";
import {
  INTERVIEW_STEP_COUNT,
  InterviewSteps,
  interviewStepIndex,
} from "@/components/interviews/interview-steps";
import { stationPointer } from "@/components/flow";
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
import { formatInterviewDateTime } from "@/lib/utils/interview-calendar";
import { cn } from "cn";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Pencil,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

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
      <PageHeaderSkeleton description />
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
  // The next step's notch points at the Preparazione station
  const stepPointer = stationPointer(interviewStepIndex("prepare"), INTERVIEW_STEP_COUNT);
  const linkClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "inline-flex",
  );

  // A draft kit of a scheduled interview is confirmed from the header
  const kitDraft =
    interview.status === "scheduled" && interview.kit?.status === "draft";

  const nextStep =
    kitDraft ? (
      <NextStep
        pointer={stepPointer}
        title="Completa il kit e segnalo come pronto"
        description="Rivedi domande e checklist (Modifica kit), poi premi Segna come pronto in alto."
        href={`${basePath}/prepare/edit`}
        actionLabel="Modifica kit"
      />
    ) : interview.status === "scheduled" ? (
      <NextStep
        pointer={stepPointer}
        title="Al momento del colloquio apri la modalità live"
        description="Lì avvii il colloquio, prendi note e segni le domande coperte."
        href={`${basePath}/live`}
        actionLabel="Apri live"
      />
    ) : interview.status === "in_progress" ? (
      <NextStep
        pointer={stepPointer}
        title="Il colloquio è in corso"
        href={`${basePath}/live`}
        actionLabel="Torna al live"
      />
    ) : interview.status === "completed" ? (
      <NextStep
        pointer={stepPointer}
        title="Compila e invia la tua scheda"
        description="Voti per criterio, evidenze e raccomandazione finale."
        href={`${basePath}/feedback`}
        actionLabel="Apri scheda"
      />
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
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
            {kitDraft && <KitReadyButton interviewId={interviewId} />}
            {interview.kit && interview.status === "scheduled" && (
              <Link
                href={`${basePath}/prepare/edit` as never}
                className={cn(
                  buttonVariants({ variant: kitDraft ? "outline" : "default", size: "sm" }),
                  "inline-flex",
                )}
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
      >
        <div className="flex flex-col">
          <InterviewSteps
            applicationId={id}
            interviewId={interviewId}
            current="prepare"
            status={interview.status}
          />
          {nextStep}
        </div>
      </PageHeader>

      <FactStrip>
          <Fact icon={CalendarClock} label="Quando">
            {formatInterviewDateTime(interview.scheduledAt)}
          </Fact>
          <Fact icon={Clock} label="Durata">
            {interview.durationMinutes} min
          </Fact>
          <Fact icon={Users} label="Partecipanti">
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
          </Fact>
          <Fact icon={Video} label="Link della call">
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
          </Fact>
      </FactStrip>

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
