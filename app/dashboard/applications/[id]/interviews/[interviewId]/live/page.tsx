import { LegalReminder } from "@/components/interviews/legal-reminder";
import { InterviewLiveMode } from "@/components/interviews/interview-live-mode";
import PageHeader from "@/components/page-header";
import { FieldSkeleton, PageHeaderSkeleton } from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentUser } from "@/lib/auth-server";
import { getInterviewLiveSession } from "@/lib/data/interviews";
import { cn } from "cn";
import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

type LiveParams = Promise<{ id: string; interviewId: string }>;

export async function generateStaticParams() {
  // Cache Components requires at least one result from generateStaticParams
  return [{ id: "placeholder", interviewId: "placeholder" }];
}

/** Live mode of an interview: always current data, never cached. */
export default function InterviewLivePage({ params }: { params: LiveParams }) {
  return (
    <Suspense fallback={<LiveSkeleton />}>
      <LiveContent params={params} />
    </Suspense>
  );
}

function LiveSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton section="applications" description />
      <div className="flex flex-col gap-4">
        <FieldSkeleton label="Domanda" />
        <FieldSkeleton label="Nota rapida" />
      </div>
    </div>
  );
}

async function LiveContent({ params }: { params: LiveParams }) {
  const { id, interviewId } = await params;

  // Session-dependent and live: read per request, never prerendered
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const session = await getInterviewLiveSession(interviewId, user.id);
  if (!session || session.applicationId !== id) {
    notFound();
  }

  const candidateName =
    `${session.candidate.firstName} ${session.candidate.lastName}`.trim();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="applications"
        title="Colloquio live"
        description={`${candidateName} · ${session.position.title} · Round ${session.round}`}
        actionBtns={
          <Link
            href={
              `/dashboard/applications/${id}/interviews/${interviewId}/prepare` as never
            }
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ClipboardList className="size-4" />
            Preparazione
          </Link>
        }
      />

      <LegalReminder />

      {session.viewerParticipantId === null && (
        <p className="bg-muted px-3 py-2 rounded-md text-muted-foreground text-sm">
          Non partecipi a questo colloquio: puoi solo consultare il kit
        </p>
      )}

      {session.kit ? (
        <InterviewLiveMode session={session} userId={user.id} />
      ) : (
        <Empty className="border h-[200px]">
          <EmptyHeader>
            <EmptyTitle>Kit non disponibile</EmptyTitle>
            <EmptyDescription>
              Questo colloquio non ha un kit da seguire.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
