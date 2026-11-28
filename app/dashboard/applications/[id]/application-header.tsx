import { getApplicationStagePresentation } from "@/components/applications/application-stage";
import { MoveStageMenu } from "@/components/applications/move-stage-menu";
import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getApplicationDetail } from "@/lib/data/applications";
import { applicationTrail } from "@/lib/utils/breadcrumbs";
import { cn } from "cn";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import Link from "next/link";
import { Suspense } from "react";
import { ApplicationOwnerControls } from "./application-owner-controls";
import { OwnerControlsSkeleton } from "./fallbacks";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Header band of the application: candidate, position, owner and "Sposta
 * fase", with one context line under the name.
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
          className={cn("mt-4", buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Vai alle candidature
        </Link>
      </div>
    );
  }

  const { candidate, position, owner, stage, stageChangedAt, createdAt } =
    detail;
  const candidateName = `${candidate.firstName} ${candidate.lastName}`.trim();
  const stageLabel = getApplicationStagePresentation(stage).label;

  return (
    <PageHeader
      title={candidateName}
      breadcrumbs={applicationTrail({ id, candidateName, position })}
      info={
        <>
          <Link
            href={`/dashboard/positions/${position.id}`}
            className="text-primary-ink hover:underline"
          >
            {position.title}
          </Link>
          <span aria-hidden className="text-muted-foreground">
            ·
          </span>
          <span className="text-muted-foreground">
            candidato dal{" "}
            {format(createdAt, "d MMMM", { locale: it })}
          </span>
          <span aria-hidden className="text-muted-foreground">
            ·
          </span>
          <span className="text-muted-foreground">
            {stageLabel} dal{" "}
            {format(stageChangedAt, "d MMM", { locale: it })}
          </span>
          <span aria-hidden className="text-muted-foreground">
            ·
          </span>
          <span className="text-muted-foreground">
            {owner ? `Responsabile: ${owner.name}` : "Nessun responsabile"}
          </span>
          {candidate.doNotContact && (
            <Badge className="bg-destructive/10 text-destructive">
              Non ricontattare
            </Badge>
          )}
        </>
      }
      actionBtns={
        <>
          <Link
            href={`/dashboard/candidates/${candidate.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            Profilo candidato
          </Link>
          <MoveStageMenu applicationId={detail.id} stage={detail.stage} />
          <Suspense fallback={<OwnerControlsSkeleton />}>
            <ApplicationOwnerControls
              applicationId={detail.id}
              owner={owner}
            />
          </Suspense>
        </>
      }
    />
  );
}
