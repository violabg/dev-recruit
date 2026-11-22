"use client";

import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/ui/rhf-inputs";
import type { UserOption } from "@/lib/data/users";
import {
  INTERVIEW_PARTICIPANT_ROLE_VALUES,
  type InterviewParticipantRole,
  type ScheduleInterviewInput,
} from "@/lib/schemas/interview";
import { Plus, Trash2 } from "lucide-react";
import {
  type Control,
  type FieldErrors,
  type FieldValues,
  type Path,
  type Resolver,
  type UseFormSetValue,
  useFieldArray,
} from "react-hook-form";
import { PARTICIPANT_ROLE_LABEL } from "./interview-presentation";

/*
 * Scheduling fields of an interview, shared by the scheduling form, the
 * edit dialog and the MCP scheduling widget. No server code: the widget
 * bundle draws them too.
 */

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
// GUIDE AND ROUND
// ====================

export type InterviewGuideOption = {
  id: string;
  title: string;
  round: number;
  durationMinutes: number;
};

/** Guide (its duration fills the duration field) and round of a new interview */
export function InterviewGuideFields({
  control,
  setValue,
  guides,
  disabled,
}: {
  control: Control<ScheduleInterviewInput>;
  setValue: UseFormSetValue<ScheduleInterviewInput>;
  guides: InterviewGuideOption[];
  disabled?: boolean;
}) {
  return (
    <div className="gap-4 grid md:grid-cols-[1fr_8rem]">
      <SelectField
        control={control}
        name="guideId"
        label="Guida colloquio"
        placeholder="Seleziona una guida"
        required
        triggerProps={{ disabled }}
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
        disabled={disabled}
        onChange={(event) =>
          setValue("round", event.currentTarget.valueAsNumber, {
            shouldDirty: true,
          })
        }
      />
    </div>
  );
}
