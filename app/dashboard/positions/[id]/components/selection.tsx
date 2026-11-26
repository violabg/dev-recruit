import { ApplicationKanban } from "@/components/applications/application-kanban";
import { AssociateCandidatesDialog } from "@/components/positions/associate-candidates-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { getApplicationsByPosition } from "@/lib/data/applications";
import { getCandidatePickerOptions } from "@/lib/data/candidates";
import {
  getPositionById,
  getPositionItemsForSelect,
} from "@/lib/data/positions";
import { cn } from "cn";
import { Plus, Users } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

const DISABLED_HINT = "Disponibile solo per posizioni aperte";

/**
 * Tab Selezione: the applications of the position by stage. New and existing
 * candidates are added only while the position is open.
 */
export default async function Selection({ params }: Props) {
  const { id } = await params;
  const [applications, position, positionItems] = await Promise.all([
    getApplicationsByPosition(id),
    getPositionById(id),
    getPositionItemsForSelect(),
  ]);
  const isOpen = position?.status === "open";
  // Not awaited: the dialog resolves it with use()
  const candidatesPromise = getCandidatePickerOptions().catch(() => []);
  const newCandidateHref = `/dashboard/candidates/new?positionId=${id}`;

  const renderActions = (variant: "header" | "empty") => {
    const Icon = variant === "empty" ? Users : Plus;

    return (
      <div
        className={cn(
          "flex flex-wrap gap-2",
          variant === "empty" && "justify-center mt-2",
        )}
      >
        {isOpen ? (
          <Link
            href={newCandidateHref as never}
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            <Icon className="mr-1 size-4" />
            Aggiungi Candidato
          </Link>
        ) : (
          <Button size="sm" disabled title={DISABLED_HINT}>
            <Icon className="mr-1 size-4" />
            Aggiungi Candidato
          </Button>
        )}
        <AssociateCandidatesDialog
          positionId={id}
          candidatesPromise={candidatesPromise}
          positionItems={positionItems}
          disabled={!isOpen}
        />
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">
          Selezione
        </h2>
        {renderActions("header")}
      </div>

      {!isOpen && (
        <p className="text-muted-foreground text-sm">
          Le candidature si aggiungono solo quando la posizione è aperta.
        </p>
      )}

      {applications.length === 0 ? (
        <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[200px]">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Nessuna candidatura per questa posizione
            </p>
            {renderActions("empty")}
          </div>
        </div>
      ) : (
        <ApplicationKanban applications={applications} />
      )}
    </>
  );
}
