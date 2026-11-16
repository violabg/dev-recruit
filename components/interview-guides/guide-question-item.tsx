"use client";

import { Button } from "@/components/ui/button";
import {
  InputWithTagField,
  MultiSelectField,
  SwitchField,
  TextareaField,
} from "@/components/ui/rhf-inputs";
import type { CriterionOption } from "@/lib/data/scorecards";
import type {
  interviewGuideEditorSchema,
  InterviewGuideEditorData,
} from "@/lib/schemas";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { type Control, useWatch } from "react-hook-form";
import type { z } from "zod";

/** Values of the guide form before validation (anchors may be missing) */
export type GuideFormValues = z.input<typeof interviewGuideEditorSchema>;

export type GuideFormControl = Control<
  GuideFormValues,
  unknown,
  InterviewGuideEditorData
>;

/** Criteria of the position scorecard; archived ones are flagged */
export type GuideCriterionOption = CriterionOption & { archived?: boolean };

type GuideQuestionItemProps = {
  control: GuideFormControl;
  sectionIndex: number;
  questionIndex: number;
  criteria: GuideCriterionOption[];
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
};

/** One question of a guide section. */
export function GuideQuestionItem({
  control,
  sectionIndex,
  questionIndex,
  criteria,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  disabled,
}: GuideQuestionItemProps) {
  const base = `sections.${sectionIndex}.questions.${questionIndex}` as const;

  const selectedCriterionIds =
    useWatch({ control, name: `${base}.criterionIds` }) ?? [];

  // Active criteria are selectable; an archived criterion is listed only
  // where already selected; an id no longer in the scorecard keeps a label
  const known = new Set(criteria.map((criterion) => criterion.id));
  const criterionOptions = [
    ...criteria
      .filter(
        (criterion) =>
          !criterion.archived || selectedCriterionIds.includes(criterion.id),
      )
      .map((criterion) => ({
        value: criterion.id,
        label: criterion.archived
          ? `${criterion.name} (archiviato)`
          : criterion.name,
      })),
    ...selectedCriterionIds
      .filter((id) => !known.has(id))
      .map((id) => ({ value: id, label: "Criterio archiviato" })),
  ];

  return (
    <div className="flex flex-col gap-4 bg-muted/30 p-4 border border-border/50 rounded-lg">
      <div className="flex justify-between items-center gap-2">
        <span className="font-medium text-sm">
          Domanda {questionIndex + 1}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveUp}
            disabled={disabled || !canMoveUp}
            aria-label="Sposta su"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveDown}
            disabled={disabled || !canMoveDown}
            aria-label="Sposta giù"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Rimuovi domanda"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <TextareaField
        control={control}
        name={`${base}.text`}
        label="Domanda"
        className="bg-background min-h-16"
      />

      <InputWithTagField
        control={control}
        name={`${base}.followUps`}
        label="Approfondimenti"
        placeholder="Scrivi un approfondimento e premi Invio"
      />

      <MultiSelectField
        control={control}
        name={`${base}.criterionIds`}
        label="Criteri verificati"
        options={criterionOptions}
        placeholder="Seleziona i criteri..."
      />

      <div className="gap-4 grid md:grid-cols-3">
        <TextareaField
          control={control}
          name={`${base}.anchors.weak`}
          label="Risposta debole"
          className="bg-background min-h-16"
        />
        <TextareaField
          control={control}
          name={`${base}.anchors.medium`}
          label="Risposta media"
          className="bg-background min-h-16"
        />
        <TextareaField
          control={control}
          name={`${base}.anchors.strong`}
          label="Risposta forte"
          className="bg-background min-h-16"
        />
      </div>

      <SwitchField
        control={control}
        name={`${base}.required`}
        label="Obbligatoria"
      />
    </div>
  );
}
