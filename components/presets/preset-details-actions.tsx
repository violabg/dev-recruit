"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deletePresetAction } from "@/lib/actions/presets";
import { Edit, Trash } from "lucide-react";
import { toast } from "sonner";

type PresetDetailsActionsProps = {
  presetId: string;
};

export function PresetDetailsActions({ presetId }: PresetDetailsActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deletePresetAction(presetId);

      if (result.success) {
        toast.success("Preset eliminato con successo");
        router.push("/dashboard/presets");
      } else {
        toast.error(result.error || "Errore nell'eliminazione del preset");
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/dashboard/presets/${presetId}/edit`}>
          <Edit className="mr-1 w-4 h-4" />
          Modifica
        </Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={isPending}>
            <Trash className="mr-1 w-4 h-4" />
            Elimina
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il preset verrà rimosso da
              tutte le posizioni che ne dipendono.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? "Eliminazione in corso..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
