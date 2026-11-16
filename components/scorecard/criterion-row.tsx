"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputField,
  SelectField,
  SliderField,
  TextareaField,
} from "@/components/ui/rhf-inputs";
import type { saveScorecardSchema, SaveScorecardInput } from "@/lib/schemas";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { type Control, useWatch } from "react-hook-form";
import type { z } from "zod";
import {
  CRITERION_CATEGORY_OPTIONS,
  CRITERION_PRIORITY_OPTIONS,
  CRITERION_SOURCE_LABEL,
} from "./criterion-presentation";

/** Values of the scorecard form before validation (anchors may be missing) */
export type ScorecardFormValues = z.input<typeof saveScorecardSchema>;

type CriterionRowProps = {
  /** Sortable id: the field-array key of the row */
  sortableId: string;
  index: number;
  control: Control<ScorecardFormValues, unknown, SaveScorecardInput>;
  onRemove: () => void;
  disabled?: boolean;
};

/** One sortable criterion of the scorecard editor. */
export function CriterionRow({
  sortableId,
  index,
  control,
  onRemove,
  disabled,
}: CriterionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: sortableId });

  const [weight, expectedLevel, source] = useWatch({
    control,
    name: [
      `criteria.${index}.weight`,
      `criteria.${index}.expectedLevel`,
      `criteria.${index}.source`,
    ],
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-3 bg-card p-4 border rounded-lg"
    >
      <button
        type="button"
        className="self-start mt-1 cursor-grab active:cursor-grabbing"
        aria-label="Trascina per riordinare"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </button>

      <div className="flex flex-col flex-1 gap-4 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <InputField
              control={control}
              name={`criteria.${index}.name`}
              label="Nome"
            />
          </div>
          <div className="flex items-center gap-2 mt-7 shrink-0">
            {source && (
              <Badge variant="outline">{CRITERION_SOURCE_LABEL[source]}</Badge>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              disabled={disabled}
              aria-label="Rimuovi criterio"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <TextareaField
          control={control}
          name={`criteria.${index}.description`}
          label="Descrizione"
          className="min-h-16"
        />

        <div className="gap-4 grid md:grid-cols-2">
          <SelectField
            control={control}
            name={`criteria.${index}.category`}
            label="Categoria"
            options={CRITERION_CATEGORY_OPTIONS}
          />
          <SelectField
            control={control}
            name={`criteria.${index}.priority`}
            label="Priorità"
            options={CRITERION_PRIORITY_OPTIONS}
          />
        </div>

        <div className="gap-4 grid md:grid-cols-2">
          <SliderField
            control={control}
            name={`criteria.${index}.weight`}
            label={`Peso: ${weight}`}
            min={1}
            max={5}
            step={1}
          />
          <SliderField
            control={control}
            name={`criteria.${index}.expectedLevel`}
            label={`Livello atteso: ${expectedLevel}`}
            min={1}
            max={5}
            step={1}
          />
        </div>

        <div className="gap-4 grid md:grid-cols-3">
          <TextareaField
            control={control}
            name={`criteria.${index}.anchors.weak`}
            label="Risposta debole"
            className="min-h-16"
          />
          <TextareaField
            control={control}
            name={`criteria.${index}.anchors.medium`}
            label="Risposta media"
            className="min-h-16"
          />
          <TextareaField
            control={control}
            name={`criteria.${index}.anchors.strong`}
            label="Risposta forte"
            className="min-h-16"
          />
        </div>
      </div>
    </div>
  );
}
