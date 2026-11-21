import { MoveStageMenu } from "@/components/applications/move-stage-menu";
import { StageStepper } from "@/components/applications/stage-stepper";
import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getApplicationDetail } from "@/lib/data/applications";
import { cn } from "cn";
import Link from "next/link";
import { Suspense } from "react";
import { ApplicationOwnerControls } from "./application-owner-controls";
import { NextActionSkeleton, OwnerControlsSkeleton } from "./fallbacks";
import { NextActionSection } from "./next-action-section";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Header band of the application: candidate, position, owner and "Sposta
 * fase", then the stage track with the next action under the current stage.
 */
export async function ApplicationHeader({ params }: Props) {
  const { id } = await params;
  const detail = await getApplicationDetail(id);

  if (!detail) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Candidatura non trovata</p>
        <Link
          href={"/dashboard/applications" as never}
          className={cn("mt-4", buttonVariants({ variant: "default" }))}
        >
          Torna alle candidature
        </Link>
      </div>
    );
  }

  const { candidate, position } = detail;

  return (
    <PageHeader
      title={`${candidate.firstName} ${candidate.lastName}`.trim()}
      info={
        <>
          <Link
            href={`/dashboard/positions/${position.id}`}
            className="text-primary-ink hover:underline"
          >
            {position.title}
          </Link>
          <Link
            href={`/dashboard/candidates/${candidate.id}`}
            className="text-primary-ink hover:underline"
          >
            Scheda candidato
          </Link>
          {candidate.doNotContact && (
            <Badge className="bg-destructive/10 text-destructive">
              Non ricontattare
            </Badge>
          )}
        </>
      }
      actionBtns={
        <>
          <Suspense fallback={<OwnerControlsSkeleton />}>
            <ApplicationOwnerControls
              applicationId={detail.id}
              owner={detail.owner}
            />
          </Suspense>
          <MoveStageMenu applicationId={detail.id} stage={detail.stage} />
        </>
      }
    >
      <div className="flex flex-col">
        <StageStepper stage={detail.stage} stageChangedAt={detail.stageChangedAt} />
        <Suspense fallback={<NextActionSkeleton />}>
          <NextActionSection params={params} />
        </Suspense>
      </div>
    </PageHeader>
  );
}
