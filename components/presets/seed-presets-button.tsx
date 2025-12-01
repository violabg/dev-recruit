"use client";

import { Button } from "@/components/ui/button";
import { seedDefaultPresetsAction } from "@/lib/actions/seed-presets";
import { Loader2, Zap } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

export function SeedPresetsButton() {
  const [isPending, startTransition] = useTransition();

  const handleSeed = () => {
    startTransition(async () => {
      const result = await seedDefaultPresetsAction();

      if (result.success) {
        toast.success(result.message, {
          description: `${result.count} preset caricati`,
        });
      } else {
        toast.error(result.error || "Errore nel caricamento dei preset");
      }
    });
  };

  return (
    <Button
      onClick={handleSeed}
      disabled={isPending}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Caricamento...
        </>
      ) : (
        <>
          <Zap className="size-4" />
          Carica preset predefiniti
        </>
      )}
    </Button>
  );
}
