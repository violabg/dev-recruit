"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rescheduleInterviewAction } from "@/lib/actions/interviews";
import type { UserOption } from "@/lib/data/users";
import {
  rescheduleInterviewSchema,
  type InterviewParticipantRole,
  type RescheduleInterviewInput,
} from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  InterviewWhenFields,
  toDateTimeLocalValue,
  withLocalScheduledAt,
} from "./interview-when-fields";

export type RescheduleInterviewDefaults = {
  id: string;
  scheduledAt: Date | string;
  durationMinutes: number;
  meetingUrl: string | null;
  participants: { userId: string; role: InterviewParticipantRole }[];
};

/**
 * Edits date, duration, call link and participants of a scheduled
 * interview. Guide and round never change; the kit is kept.
 */
export function RescheduleInterviewDialog({
  open,
  onOpenChange,
  interview,
  users,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interview: RescheduleInterviewDefaults;
  users: UserOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<RescheduleInterviewInput>({
    resolver: withLocalScheduledAt(zodResolver(rescheduleInterviewSchema)),
    defaultValues: {
      interviewId: interview.id,
      scheduledAt: toDateTimeLocalValue(interview.scheduledAt),
      durationMinutes: interview.durationMinutes,
      meetingUrl: interview.meetingUrl ?? "",
      participants: interview.participants,
    },
  });
  const { control, handleSubmit, setValue, formState } = form;

  function onSubmit(values: RescheduleInterviewInput) {
    startTransition(async () => {
      try {
        unwrap(await rescheduleInterviewAction(values));
        toast.success("Colloquio aggiornato");
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Modifica colloquio</DialogTitle>
          <DialogDescription>
            Cambia data, durata, link e partecipanti. Guida, round e kit
            restano invariati; l&apos;app non invia email.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <InterviewWhenFields
            control={control}
            setValue={setValue}
            errors={formState.errors}
            users={users}
            disabled={isPending}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Salva modifiche
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
