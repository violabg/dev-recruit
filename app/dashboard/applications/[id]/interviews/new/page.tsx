import { ScheduleInterviewForm } from "@/components/interviews/schedule-interview-form";
import PageHeader from "@/components/page-header";
import { FieldSkeleton, PageHeaderSkeleton } from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentUser } from "@/lib/auth-server";
import {
  getApplicationDetail,
  getRecentApplicationIds,
} from "@/lib/data/applications";
import { getInterviewGuidesByPosition } from "@/lib/data/interview-guides";
import { getInterviewsByApplication } from "@/lib/data/interviews";
import { getUserOptions } from "@/lib/data/users";
import type { ApplicationStage } from "@/lib/schemas";
import { cn } from "cn";
import { ArrowLeft, BookOpen, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

type NewInterviewParams = Promise<{ id: string }>;

/** Stages on which no interview can be scheduled */
const NO_SCHEDULING_STAGES: readonly ApplicationStage[] = [
  "rejected",
  "withdrawn",
  "hired",
];

export async function generateStaticParams() {
  const applicationIds = await getRecentApplicationIds(100);

  // Cache Components requires at least one result from generateStaticParams
  if (applicationIds.length === 0) {
    return [{ id: "placeholder" }];
  }

  return applicationIds.map((id) => ({ id }));
}

/** Scheduling page of an interview of the application. */
export default function NewInterviewPage({
  params,
}: {
  params: NewInterviewParams;
}) {
  return (
    <Suspense fallback={<NewInterviewSkeleton />}>
      <NewInterviewContent params={params} />
    </Suspense>
  );
}

function NewInterviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton section="applications" description />
      <div className="flex flex-col gap-4 max-w-3xl">
        <FieldSkeleton label="Guida colloquio" />
        <FieldSkeleton label="Data e ora" />
        <FieldSkeleton label="Partecipanti" />
      </div>
    </div>
  );
}

async function NewInterviewContent({ params }: { params: NewInterviewParams }) {
  const { id } = await params;

  // The session is read per request, after connection() so it never runs
  // while the route is prerendered
  await connection();
  const currentUser = await getCurrentUser();

  const detail = await getApplicationDetail(id);
  if (!detail) {
    notFound();
  }

  const [guides, users, interviews] = await Promise.all([
    getInterviewGuidesByPosition(detail.position.id),
    getUserOptions(),
    getInterviewsByApplication(id),
  ]);

  const proposedRound =
    interviews.filter((interview) => interview.status !== "cancelled").length +
    1;
  const candidateName =
    `${detail.candidate.firstName} ${detail.candidate.lastName}`.trim();

  return (
    <>
      <PageHeader
        section="applications"
        title="Pianifica colloquio"
        description={`${candidateName} · ${detail.position.title}`}
        actionBtns={
          <Link
            href={`/dashboard/applications/${id}?tab=colloqui` as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="mr-1 size-4" />
            Torna alla candidatura
          </Link>
        }
      />

      {NO_SCHEDULING_STAGES.includes(detail.stage) ? (
        <Empty className="border h-[220px]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Lock />
            </EmptyMedia>
            <EmptyTitle>Candidatura chiusa</EmptyTitle>
            <EmptyDescription>
              Non è possibile pianificare colloqui su questa candidatura.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : guides.length === 0 ? (
        <Empty className="border h-[260px]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>Nessuna guida colloquio</EmptyTitle>
            <EmptyDescription>
              Per pianificare un colloquio serve una guida colloquio della
              posizione.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              href={`/dashboard/positions/${detail.position.id}/guides/new`}
              className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
            >
              Crea la guida
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <ScheduleInterviewForm
          applicationId={id}
          guides={guides.map((guide) => ({
            id: guide.id,
            title: guide.title,
            round: guide.round,
            durationMinutes: guide.durationMinutes,
          }))}
          users={users}
          currentUserId={currentUser?.id ?? ""}
          proposedRound={proposedRound}
        />
      )}
    </>
  );
}
