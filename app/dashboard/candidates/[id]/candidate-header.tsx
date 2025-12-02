import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { deleteCandidate } from "@/lib/actions/candidates";
import { getCandidateWithDetails } from "@/lib/data/candidates";
import { ClipboardCheck, Edit } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export async function CandidateHeader({ params }: Props) {
  const { id } = await params;
  const candidate = await getCandidateWithDetails(id);

  if (!candidate) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px]">
        <p className="font-medium text-lg">Candidato non trovato</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/candidates">Torna ai candidati</Link>
        </Button>
      </div>
    );
  }

  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="font-bold text-3xl">{fullName}</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline">{candidate.status}</Badge>
          {candidate.position && (
            <Badge variant="secondary">{candidate.position.title}</Badge>
          )}
          <span className="text-muted-foreground text-sm">
            {candidate.email}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline">
          <Link
            href={
              `/dashboard/candidates/${candidate.id}/evaluations` as Route<`/dashboard/candidates/${string}/evaluations`>
            }
          >
            <ClipboardCheck className="mr-1 size-4" />
            Valutazioni
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link
            href={
              `/dashboard/candidates/${candidate.id}/edit` as Route<`/dashboard/candidates/${string}/edit`>
            }
          >
            <Edit className="mr-1 size-4" />
            Modifica
          </Link>
        </Button>
        <DeleteWithConfirm
          deleteAction={deleteCandidate.bind(null, candidate.id)}
          description="Questa azione non può essere annullata. Il candidato e tutti i dati associati verranno eliminati permanentemente."
          errorMessage="Errore durante l'eliminazione del candidato"
        />
      </div>
    </div>
  );
}
