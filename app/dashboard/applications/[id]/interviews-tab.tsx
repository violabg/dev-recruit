import { InterviewCard } from "@/components/interviews/interview-card";
import { InterviewProposalCard } from "@/components/interviews/interview-proposal-card";
import { buttonVariants } from "@/components/ui/button";
import { getApplicationDetail } from "@/lib/data/applications";
import { getPendingInterviewProposals } from "@/lib/data/interview-proposals";
import { getInterviewsByApplication } from "@/lib/data/interviews";
import { getUserOptions } from "@/lib/data/users";
import type { ApplicationStage } from "@/lib/schemas";
import { cn } from "cn";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
  /** The stop holds the next action: its link is the single primary */
  primaryAction?: boolean;
};

type InterviewStopProps = {
  params: Promise<{ id: string }>;
  interviewId: string;
};

/** Stages on which no interview can be scheduled */
const NO_SCHEDULING_STAGES: readonly ApplicationStage[] = [
  "rejected",
  "withdrawn",
  "hired",
];

/** Colloquio stop body: the interview card of that round. */
export async function InterviewStopBody({ params, interviewId }: InterviewStopProps) {
  const { id } = await params;
  const [detail, interviews, users] = await Promise.all([
    getApplicationDetail(id),
    getInterviewsByApplication(id),
    getUserOptions(),
  ]);

  if (!detail) {
    return null;
  }

  const interview = interviews.find((item) => item.id === interviewId);
  if (!interview) return null;

  const candidateName =
    `${detail.candidate.firstName} ${detail.candidate.lastName}`.trim();

  return (
    <InterviewCard
      interview={interview}
      candidateName={candidateName}
      positionTitle={detail.position.title}
      users={users}
    />
  );
}

/** Pending Colloquio stop body: pending proposals and the scheduling link. */
export async function ScheduleInterviewBody({ params, primaryAction = false }: Props) {
  const { id } = await params;
  const [detail, proposals] = await Promise.all([
    getApplicationDetail(id),
    getPendingInterviewProposals(id),
  ]);

  if (!detail) {
    return null;
  }

  const canSchedule = !NO_SCHEDULING_STAGES.includes(detail.stage);

  return (
    <div className="flex flex-col gap-3">
      {canSchedule && (
        <div className="flex justify-end">
          <Link
            href={`/dashboard/applications/${id}/interviews/new` as never}
            className={cn(
              buttonVariants({
                variant: primaryAction ? "default" : "outline",
                size: "sm",
              }),
              "inline-flex",
            )}
          >
            <CalendarPlus className="size-4" />
            Pianifica colloquio
          </Link>
        </div>
      )}

      {proposals.length > 0 ? (
        <section aria-label="Proposte da confermare" className="flex flex-col gap-3">
          <h3 className="font-medium text-sm">Proposte da confermare</h3>
          {proposals.map((proposal) => (
            <InterviewProposalCard
              key={proposal.id}
              proposal={proposal}
              canSchedule={canSchedule}
            />
          ))}
        </section>
      ) : (
        <p className="text-muted-foreground text-sm">
          {canSchedule
            ? "Nessuna proposta da confermare."
            : "Nessun colloquio da pianificare."}
        </p>
      )}
    </div>
  );
}
