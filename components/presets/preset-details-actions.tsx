"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { deletePresetAction } from "@/lib/actions/presets";
import { Edit } from "lucide-react";

type PresetDetailsActionsProps = {
  presetId: string;
};

export function PresetDetailsActions({ presetId }: PresetDetailsActionsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/dashboard/presets/${presetId}/edit`}>
          <Edit className="mr-1 w-4 h-4" />
          Modifica
        </Link>
      </Button>

      <DeleteWithConfirm
        deleteAction={() => deletePresetAction(presetId)}
        description="Questa azione non può essere annullata. Il preset verrà rimosso da tutte le posizioni che ne dipendono."
        successMessage="Preset eliminato con successo"
        errorMessage="Errore nell'eliminazione del preset"
        onSuccess={() => router.push("/dashboard/presets")}
      />
    </div>
  );
}
