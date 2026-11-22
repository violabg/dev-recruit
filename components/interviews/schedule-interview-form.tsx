"use client";

import { Button } from "@/components/ui/button";
import { scheduleInterviewAction } from "@/lib/actions/interviews";
import type { UserOption } from "@/lib/data/users";
import {
  scheduleInterviewSchema,
  type ScheduleInterviewInput,
} from "@/lib/schemas";
import { errorMessage } from "@/lib/utils/action-result";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  InterviewGuideFields,
  InterviewWhenFields,
  withLocalScheduledAt,
} from "./interview-when-fields";

// ====================
// SCHEDULING FORM
// ====================

type ScheduleInterviewFormProps = {
  applicationId: string;
  guides: { id: string; title: string; round: number; durationMinutes: number }[];
  users: UserOption[];
  currentUserId: string;
  proposedRound: number;
};

/**
 * Schedules an interview of the application. The guide of the proposed round
 * is preselected and the signed-in user is the lead. The action redirects to
 * the preparation page; no email is sent.
 */
export function ScheduleInterviewForm({
  applicationId,
  guides,
  users,
  currentUserId,
  proposedRound,
}: ScheduleInterviewFormProps) {
  const [isPending, startTransition] = useTransition();

  const initialGuide =
    guides.find((guide) => guide.round === proposedRound) ?? guides[0];

  const form = useForm<ScheduleInterviewInput>({
    resolver: withLocalScheduledAt(zodResolver(scheduleInterviewSchema)),
    defaultValues: {
      applicationId,
      guideId: initialGuide?.id ?? "",
      round: proposedRound,
      scheduledAt: "",
      durationMinutes: initialGuide?.durationMinutes ?? 60,
      meetingUrl: "",
      participants: [{ userId: currentUserId, role: "lead" }],
    },
  });
  const { control, handleSubmit, setValue, formState } = form;

  function onSubmit(values: ScheduleInterviewInput) {
    startTransition(async () => {
      // On success the action redirects and returns nothing
      const result = await scheduleInterviewAction(values);
      if (result && !result.success) {
        toast.error(errorMessage(new Error(result.error)));
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6 max-w-3xl"
      noValidate
    >
      <InterviewGuideFields
        control={control}
        setValue={setValue}
        guides={guides}
        disabled={isPending}
      />

      <InterviewWhenFields
        control={control}
        setValue={setValue}
        errors={formState.errors}
        users={users}
        disabled={isPending}
      />

      <p className="text-muted-foreground text-sm">
        L&apos;app non invia email: dopo la pianificazione potrai copiare il
        riepilogo o scaricare il file .ics da condividere.
      </p>

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CalendarPlus className="size-4" />
        )}
        Pianifica colloquio
      </Button>
    </form>
  );
}
