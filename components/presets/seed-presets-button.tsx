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
          description: `${result.count} presets loaded`,
        });
      } else {
        toast.error(result.error || "Failed to seed presets");
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
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <Zap className="w-4 h-4" />
          Load Default Presets
        </>
      )}
    </Button>
  );
}
