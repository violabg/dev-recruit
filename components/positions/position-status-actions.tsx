"use client";

import { Button } from "@/components/ui/button";
import { updatePositionStatusAction } from "@/lib/actions/positions";
import type { PositionStatus } from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

/** The single move offered from each status, with its success message */
const NEXT_STATUS: Record<
  PositionStatus,
  { target: PositionStatus; label: string; success: string }
> = {
  draft: { target: "open", label: "Pubblica", success: "Posizione pubblicata" },
  open: { target: "closed", label: "Chiudi", success: "Posizione chiusa" },
  closed: { target: "open", label: "Riapri", success: "Posizione riaperta" },
};

/**
 * Publishes, closes or reopens a position from its header. A draft gets the
 * primary button: publishing is its next step.
 */
export function PositionStatusActions({
  positionId,
  status,
}: {
  positionId: string;
  status: PositionStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const next = NEXT_STATUS[status];

  const handleClick = () => {
    startTransition(async () => {
      try {
        unwrap(
          await updatePositionStatusAction({
            positionId,
            status: next.target,
          }),
        );
        toast.success(next.success);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  };

  return (
    <Button
      type="button"
      variant={status === "draft" ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-1 size-4 animate-spin" />
      ) : (
        status === "draft" && <Send className="mr-1 size-4" />
      )}
      {next.label}
    </Button>
  );
}
