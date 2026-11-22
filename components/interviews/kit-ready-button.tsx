"use client";

import { Button } from "@/components/ui/button";
import { setInterviewKitStatusAction } from "@/lib/actions/interview-kits";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

/**
 * Marks a draft kit ready from the preparation page, without opening the
 * editor: the confirmation of a kit prepared in the app or by the assistant.
 */
export function KitReadyButton({ interviewId }: { interviewId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function markReady() {
    startTransition(async () => {
      try {
        unwrap(await setInterviewKitStatusAction({ interviewId, status: "ready" }));
        toast.success("Kit pronto");
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  return (
    <Button
      type="button"
      variant="success"
      size="sm"
      disabled={isPending}
      onClick={markReady}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CheckCircle2 className="size-4" />
      )}
      Segna come pronto
    </Button>
  );
}
