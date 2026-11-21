"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  discardInterviewProposalAction,
  scheduleInterviewProposalAction,
} from "@/lib/actions/interview-proposals";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { CalendarCheck, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type Confirmation = "schedule" | "discard";

const CONFIRMATION_TEXT: Record<
  Confirmation,
  { title: string; description: string; confirm: string }
> = {
  schedule: {
    title: "Pianificare il colloquio proposto?",
    description:
      "Si crea il colloquio con il kit in bozza e la candidatura passa a Colloquio, come dalla pianificazione. L'app non invia email: avvisa tu i partecipanti.",
    confirm: "Pianifica",
  },
  discard: {
    title: "Scartare la proposta?",
    description: "La proposta sparisce dal tab Colloqui. Non viene pianificato nulla.",
    confirm: "Scarta",
  },
};

/** Pianifica and Scarta of a pending interview proposal. */
export function InterviewProposalActions({
  proposalId,
  canSchedule,
}: {
  proposalId: string;
  /** False on a closed application: the proposal can only be discarded */
  canSchedule: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const confirm = () => {
    if (!confirmation) return;
    startTransition(async () => {
      if (confirmation === "schedule") {
        // On success the action redirects and returns nothing
        const result = await scheduleInterviewProposalAction({ proposalId });
        if (result && !result.success) toast.error(errorMessage(new Error(result.error)));
        setConfirmation(null);
        return;
      }
      try {
        unwrap(await discardInterviewProposalAction({ proposalId }));
        toast.success("Proposta scartata");
        setConfirmation(null);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  };

  const text = confirmation ? CONFIRMATION_TEXT[confirmation] : null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canSchedule && (
          <Button size="sm" disabled={isPending} onClick={() => setConfirmation("schedule")}>
            <CalendarCheck className="size-4" />
            Pianifica
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => setConfirmation("discard")}
        >
          <X className="size-4" />
          Scarta
        </Button>
      </div>

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => !open && !isPending && setConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text?.title}</AlertDialogTitle>
            <AlertDialogDescription>{text?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {text?.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
