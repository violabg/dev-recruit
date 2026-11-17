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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  cancelInterviewAction,
  markInterviewNoShowAction,
} from "@/lib/actions/interviews";
import type { UserOption } from "@/lib/data/users";
import type { InterviewStatus } from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { canTransition } from "@/lib/utils/interview-status";
import { Ban, CalendarClock, Loader2, MoreHorizontal, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  RescheduleInterviewDialog,
  type RescheduleInterviewDefaults,
} from "./reschedule-interview-dialog";

type Confirmation = "cancel" | "no_show";

const CONFIRMATION_TEXT: Record<
  Confirmation,
  { title: string; description: string; confirm: string; success: string }
> = {
  cancel: {
    title: "Annullare il colloquio?",
    description:
      "Il colloquio resta nello storico della candidatura come annullato. L'app non invia email: avvisa tu i partecipanti.",
    confirm: "Annulla colloquio",
    success: "Colloquio annullato",
  },
  no_show: {
    title: "Segnare il colloquio come non presentato?",
    description:
      "Il colloquio resta nello storico della candidatura come non presentato.",
    confirm: "Segna come non presentato",
    success: "Colloquio segnato come non presentato",
  },
};

/** Status gestures of an interview card: edit, cancel, no-show. */
export function InterviewCardActions({
  interview,
  status,
  users,
}: {
  interview: RescheduleInterviewDefaults;
  status: InterviewStatus;
  users: UserOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const canEdit = canTransition(status, "reschedule");
  const canCancel = canTransition(status, "cancel");
  const canMarkNoShow = canTransition(status, "no_show");

  const confirm = () => {
    if (!confirmation) return;
    const text = CONFIRMATION_TEXT[confirmation];
    startTransition(async () => {
      try {
        const input = { interviewId: interview.id };
        unwrap(
          confirmation === "cancel"
            ? await cancelInterviewAction(input)
            : await markInterviewNoShowAction(input),
        );
        toast.success(text.success);
        setConfirmation(null);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              disabled={isPending}
              aria-label="Azioni del colloquio"
            />
          }
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MoreHorizontal className="size-4" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem disabled={!canEdit} onClick={() => setEditOpen(true)}>
            <CalendarClock className="size-4" />
            Modifica
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canCancel}
            onClick={() => setConfirmation("cancel")}
          >
            <Ban className="size-4" />
            Annulla colloquio
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canMarkNoShow}
            onClick={() => setConfirmation("no_show")}
          >
            <UserX className="size-4" />
            Segna come non presentato
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editOpen && (
        <RescheduleInterviewDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          interview={interview}
          users={users}
        />
      )}

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          {confirmation && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {CONFIRMATION_TEXT[confirmation].title}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {CONFIRMATION_TEXT[confirmation].description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Indietro</AlertDialogCancel>
                <AlertDialogAction onClick={confirm} disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  {CONFIRMATION_TEXT[confirmation].confirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
