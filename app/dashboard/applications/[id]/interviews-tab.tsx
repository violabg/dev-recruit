import { InterviewCard } from "@/components/interviews/interview-card";
import { InterviewProposalCard } from "@/components/interviews/interview-proposal-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getApplicationDetail } from "@/lib/data/applications";
import { getPendingInterviewProposals } from "@/lib/data/interview-proposals";
import { getInterviewsByApplication } from "@/lib/data/interviews";
import { getUserOptions } from "@/lib/data/users";
import type { ApplicationStage } from "@/lib/schemas";
import { cn } from "cn";
import { CalendarPlus, MessagesSquare } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

/** Stages on which no interview can be scheduled */
const NO_SCHEDULING_STAGES: readonly ApplicationStage[] = [
  "rejected",
  "withdrawn",
  "hired",
];

/**
 * Tab Colloqui: the pending proposals prepared with the assistant, then the
 * interviews of the application, newest round first.
 */
export async function InterviewsTab({ params }: Props) {
  const { id } = await params;
  const [detail, interviews, users, proposals] = await Promise.all([
    getApplicationDetail(id),
    getInterviewsByApplication(id),
    getUserOptions(),
    getPendingInterviewProposals(id),
  ]);

  if (!detail) {
    return null;
  }

  const candidateName =
    `${detail.candidate.firstName} ${detail.candidate.lastName}`.trim();
  const canSchedule = !NO_SCHEDULING_STAGES.includes(detail.stage);

  return (
    <>
      {canSchedule && (
        <div className="flex justify-end">
          <Link
            href={`/dashboard/applications/${id}/interviews/new` as never}
            className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
          >
            <CalendarPlus className="size-4" />
            Pianifica colloquio
          </Link>
        </div>
      )}

      {proposals.length > 0 && (
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
      )}

      {interviews.length === 0 && proposals.length === 0 ? (
        <Empty className="border h-[220px]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessagesSquare />
            </EmptyMedia>
            <EmptyTitle>Nessun colloquio</EmptyTitle>
            <EmptyDescription>
              Pianifica il primo colloquio della candidatura.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        interviews.map((interview) => (
          <InterviewCard
            key={interview.id}
            interview={interview}
            candidateName={candidateName}
            positionTitle={detail.position.title}
            users={users}
          />
        ))
      )}
    </>
  );
}
