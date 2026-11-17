"use client";

import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/ui/rhf-inputs";
import { scheduleInterviewAction } from "@/lib/actions/interviews";
import type { UserOption } from "@/lib/data/users";
import {
  INTERVIEW_PARTICIPANT_ROLE_VALUES,
  scheduleInterviewSchema,
  type InterviewParticipantRole,
  type ScheduleInterviewInput,
} from "@/lib/schemas";
import { errorMessage } from "@/lib/utils/action-result";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Loader2, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import {
  type Control,
  type FieldErrors,
  type FieldValues,
  type Path,
  type Resolver,
  type UseFormSetValue,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { toast } from "sonner";
import { PARTICIPANT_ROLE_LABEL } from "./interview-presentation";

// ====================
// DATE HELPERS
// ====================

/** 'YYYY-MM-DDTHH:mm' of a date in the browser's time zone, for a datetime-local field */
export function toDateTimeLocalValue(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate(),
  )}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/** ISO string of a datetime-local value, read with the browser's offset */
export function localDateTimeToIso(value: string): string {
  if (!value) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/**
 * Resolver of a schema whose scheduledAt is an ISO datetime: the form keeps
 * the datetime-local string and converts it before validation.
 */
export function withLocalScheduledAt<T extends { scheduledAt: string }>(
  resolver: Resolver<T>,
): Resolver<T> {
  return (values, context, options) =>
    resolver(
      { ...values, scheduledAt: localDateTimeToIso(values.scheduledAt) },
      context,
      options,
    );
}

// ====================
// SHARED FIELDS
// ====================

type WhenValues = FieldValues & {
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl?: string;
  participants: { userId: string; role: InterviewParticipantRole }[];
};

const ROLE_OPTIONS = INTERVIEW_PARTICIPANT_ROLE_VALUES.map((role) => ({
  value: role,
  label: PARTICIPANT_ROLE_LABEL[role],
}));

/**
 * Date and time, duration, call link and participants: shared by the
 * scheduling form and the edit dialog.
 */
export function InterviewWhenFields<T extends WhenValues>({
  control,
  setValue,
  errors,
  users,
  disabled,
}: {
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  errors: FieldErrors<T>;
  users: UserOption[];
  disabled?: boolean;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "participants" as never,
  });

  const userOptions = users.map((user) => ({
    value: user.id,
    label: user.name || user.email,
  }));

  const participantErrors = errors.participants as
    | { message?: string; root?: { message?: string } }
    | undefined;
  const participantsMessage =
    participantErrors?.root?.message ?? participantErrors?.message;

  return (
    <>
      <div className="gap-4 grid md:grid-cols-[1fr_10rem]">
        <InputField
          control={control}
          name={"scheduledAt" as Path<T>}
          label="Data e ora"
          type="datetime-local"
          required
          disabled={disabled}
        />
        <InputField
          control={control}
          name={"durationMinutes" as Path<T>}
          label="Durata (minuti)"
          type="number"
          min={10}
          max={480}
          required
          disabled={disabled}
          onChange={(event) =>
            setValue(
              "durationMinutes" as Path<T>,
              event.currentTarget.valueAsNumber as T[Path<T>],
              { shouldDirty: true },
            )
          }
        />
      </div>

      <InputField
        control={control}
        name={"meetingUrl" as Path<T>}
        label="Link della call"
        type="url"
        placeholder="https://"
        disabled={disabled}
      />

      <div className="flex flex-col gap-3">
        <span className="font-medium text-sm">Partecipanti</span>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="items-end gap-3 grid grid-cols-[1fr_10rem_auto]"
          >
            <SelectField
              control={control}
              name={`participants.${index}.userId` as Path<T>}
              label="Partecipante"
              placeholder="Seleziona un utente"
              options={userOptions}
              triggerProps={{ disabled }}
            />
            <SelectField
              control={control}
              name={`participants.${index}.role` as Path<T>}
              label="Ruolo"
              options={ROLE_OPTIONS}
              triggerProps={{ disabled }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Rimuovi partecipante"
              disabled={disabled || fields.length <= 1}
              onClick={() => remove(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {participantsMessage && (
          <p className="text-destructive text-sm">{participantsMessage}</p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={disabled || fields.length >= 10}
          onClick={() => append({ userId: "", role: "observer" } as never)}
        >
          <Plus className="size-4" />
          Aggiungi partecipante
        </Button>
      </div>
    </>
  );
}

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
      <div className="gap-4 grid md:grid-cols-[1fr_8rem]">
        <SelectField
          control={control}
          name="guideId"
          label="Guida colloquio"
          placeholder="Seleziona una guida"
          required
          triggerProps={{ disabled: isPending }}
          options={guides.map((guide) => ({
            value: guide.id,
            label: `${guide.title} (round ${guide.round}, ${guide.durationMinutes} min)`,
          }))}
          onValueChange={(guideId) => {
            const guide = guides.find((item) => item.id === guideId);
            if (guide) {
              setValue("durationMinutes", guide.durationMinutes, {
                shouldDirty: true,
              });
            }
          }}
        />
        <InputField
          control={control}
          name="round"
          label="Round"
          type="number"
          min={1}
          max={10}
          required
          disabled={isPending}
          onChange={(event) =>
            setValue("round", event.currentTarget.valueAsNumber, {
              shouldDirty: true,
            })
          }
        />
      </div>

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
