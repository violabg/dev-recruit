import { cn } from "cn";
import PageHeader from "@/components/page-header";
import { getPositionStatusPresentation } from "@/components/positions/position-status";
import { CopyApplyLinkButton } from "@/components/positions/copy-apply-link-button";
import { PositionStatusActions } from "@/components/positions/position-status-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { deletePositionAction } from "@/lib/actions/positions";
import { getPositionById } from "@/lib/data/positions";
import { formatDate } from "@/lib/utils";
import { positionTrail } from "@/lib/utils/breadcrumbs";
import { Edit } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PositionHeader({ params }: Props) {
  const { id } = await params;
  const position = await getPositionById(id);

  if (!position) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Posizione non trovata</p>
        <Link
          href="/dashboard/positions"
          className={cn(
            "mt-4",
            buttonVariants({ variant: "outline", size: "sm" }),
          )}
        >
          Vai alle posizioni
        </Link>
      </div>
    );
  }

  const status = getPositionStatusPresentation(position.status);

  return (
    <PageHeader
      title={position.title}
      breadcrumbs={positionTrail(position)}
      info={
        <>
          <Badge className={cn("w-fit", status.badge)}>{status.label}</Badge>
          <span className="text-muted-foreground text-sm">
            {position.experienceLevel}
          </span>
          {position.contractType && (
            <span className="text-muted-foreground text-sm">
              {position.contractType}
            </span>
          )}
          <span className="text-muted-foreground text-sm">
            Creata il {formatDate(position.createdAt.toISOString())}
          </span>
        </>
      }
      actionBtns={
        <>
          <PositionStatusActions
            positionId={position.id}
            status={position.status}
          />
          {position.status === "open" && (
            <CopyApplyLinkButton positionId={position.id} />
          )}
          <Link
            href={`/dashboard/positions/${position.id}/edit`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <Edit className="mr-1 size-4" />
            Modifica
          </Link>

          <DeleteWithConfirm
            deleteAction={deletePositionAction.bind(null, position.id)}
            description="Questa azione non può essere annullata. Una posizione con candidature non si può eliminare: chiudila."
            errorMessage="Errore durante l'eliminazione della posizione"
          />
        </>
      }
    />
  );
}
