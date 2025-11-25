import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { deletePosition } from "@/lib/actions/positions";

export function DeletePositionButton({ id }: { id: string }) {
  return (
    <DeleteWithConfirm
      deleteAction={() => deletePosition(id)}
      description="Questa azione non può essere annullata. Verranno eliminati anche tutti i quiz e i candidati associati a questa posizione."
      errorMessage="Errore durante l'eliminazione della posizione"
    />
  );
}
