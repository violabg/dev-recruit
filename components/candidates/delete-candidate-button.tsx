"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { deleteCandidate } from "@/lib/actions/candidates";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function DeleteCandidateButton({
  candidateId,
}: {
  candidateId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const result = await deleteCandidate(candidateId);
      if (result.success) {
        toast.success("Candidato eliminato con successo");
        router.push("/dashboard/candidates");
      }
    } catch (error) {
      console.error("Error deleting candidate:", error);
      toast.error("Errore durante l'eliminazione del candidato");
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 w-4 h-4" />
          Elimina candidato
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">
              Confermare l'eliminazione?
            </h4>
            <p className="text-muted-foreground text-sm">
              Questa azione non può essere annullata. Il candidato e tutti i
              dati associati verranno eliminati permanentemente.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Eliminando..." : "Elimina"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
