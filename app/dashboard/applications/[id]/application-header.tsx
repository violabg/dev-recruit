import { ApplicationStageBadge } from "@/components/applications/application-stage-badge";
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
import { OwnerControlsSkeleton } from "./fallbacks";

type Props = {
  params: Promise<{ id: string }>;
};

/** Header of the application: candidate, position, stage, owner. */
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
    <div className="flex flex-col gap-4">
      <PageHeader
        section="applications"
        title={`${candidate.firstName} ${candidate.lastName}`.trim()}
        description={position.title}
        info={
          <>
            <ApplicationStageBadge stage={detail.stage} />
            {candidate.doNotContact && (
              <Badge className="bg-destructive/10 text-destructive">
                Non ricontattare
              </Badge>
            )}
            <Link
              href={`/dashboard/candidates/${candidate.id}`}
              className="text-primary text-sm hover:underline"
            >
              Candidato
            </Link>
            <Link
              href={`/dashboard/positions/${position.id}`}
              className="text-primary text-sm hover:underline"
            >
              Posizione
            </Link>
          </>
        }
        actionBtns={<MoveStageMenu applicationId={detail.id} stage={detail.stage} />}
      />
      <StageStepper stage={detail.stage} />
      <Suspense fallback={<OwnerControlsSkeleton />}>
        <ApplicationOwnerControls
          applicationId={detail.id}
          owner={detail.owner}
        />
      </Suspense>
    </div>
  );
}
