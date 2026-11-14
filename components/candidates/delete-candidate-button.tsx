import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { deleteCandidateAction } from "@/lib/actions/candidates";

export function DeleteCandidateButton({
  candidateId,
}: {
  candidateId: string;
}) {
  return (
    <DeleteWithConfirm
      deleteAction={() => deleteCandidateAction(candidateId)}
      description="Questa azione non può essere annullata. Il candidato e tutti i dati associati verranno eliminati permanentemente."
      errorMessage="Errore durante l'eliminazione del candidato"
    />
  );
}
