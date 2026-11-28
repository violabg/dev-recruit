"use client";

import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Copies the public apply link of an open position
 * (/recruiting/positions/[id]), to share in a job post.
 */
export function CopyApplyLinkButton({ positionId }: { positionId: string }) {
  const copy = async () => {
    const url = `${window.location.origin}/recruiting/positions/${positionId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link candidatura copiato");
    } catch {
      toast.error("Copia non riuscita. Il link è " + url);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      <Link2 className="mr-1 size-4" />
      Copia link candidatura
    </Button>
  );
}
