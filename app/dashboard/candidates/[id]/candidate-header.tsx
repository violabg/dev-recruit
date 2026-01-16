import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { deleteCandidate } from "@/lib/actions/candidates";
import { getCandidateWithDetails } from "@/lib/data/candidates";
import { ClipboardCheck, Edit, Link2 } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export async function CandidateHeader({ params }: Props) {
  const { id } = await params;
  const candidate = await getCandidateWithDetails(id);

  if (!candidate) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Candidato non trovato</p>
        <Link
          href="/dashboard/candidates"
          className={`mt-4 ${buttonVariants({ variant: "default" })}`}
        >
          Torna ai candidati
        </Link>
      </div>
    );
  }

  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();

  return (
    <PageHeader
      title={fullName}
      info={
        <>
          <Badge variant="outline">{candidate.status}</Badge>
          {candidate.positions && candidate.positions.length > 0 && (
            <Badge variant="secondary">
              {candidate.positions[0]?.position?.title}
            </Badge>
          )}
          <span className="text-muted-foreground text-sm">
            {candidate.email}
          </span>
        </>
      }
      actionBtns={
        <>
          <Link
            href={`/dashboard/candidates/${candidate.id}/quiz`}
            className={`${buttonVariants({ variant: "outline" })} inline-flex`}
          >
            <Link2 className="mr-1 size-4" />
            Associa quiz
          </Link>
          <Link
            href={`/dashboard/candidates/${candidate.id}/evaluations`}
            className={`${buttonVariants({ variant: "outline" })} inline-flex`}
          >
            <ClipboardCheck className="mr-1 size-4" />
            Valutazioni
          </Link>
          <Link
            href={`/dashboard/candidates/${candidate.id}/edit`}
            className={`${buttonVariants({ variant: "outline" })} inline-flex`}
          >
            <Edit className="mr-1 size-4" />
            Modifica
          </Link>
          <DeleteWithConfirm
            deleteAction={deleteCandidate.bind(null, candidate.id)}
            description="Questa azione non può essere annullata. Il candidato e tutti i dati associati verranno eliminati permanentemente."
            errorMessage="Errore durante l'eliminazione del candidato"
          />
        </>
      }
    />
  );
}
