import { ApplicationKanban } from "@/components/applications/application-kanban";
import { buttonVariants } from "@/components/ui/button";
import { getApplicationsByPosition } from "@/lib/data/applications";
import { cn } from "cn";
import { Plus, Users } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

/** Tab Selezione: the applications of the position by stage. */
export default async function Selection({ params }: Props) {
  const { id } = await params;
  const applications = await getApplicationsByPosition(id);
  const newCandidateHref = `/dashboard/candidates/new?positionId=${id}`;

  return (
    <>
      <div className="flex justify-between">
        <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">
          Selezione
        </h2>
        <Link
          href={newCandidateHref as never}
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          <Plus className="mr-1 size-4" />
          Aggiungi Candidato
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[200px]">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Nessuna candidatura per questa posizione
            </p>
            <Link
              href={newCandidateHref as never}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "mt-2",
              )}
            >
              <Users className="mr-1 size-4" />
              Aggiungi Candidato
            </Link>
          </div>
        </div>
      ) : (
        <ApplicationKanban applications={applications} />
      )}
    </>
  );
}
