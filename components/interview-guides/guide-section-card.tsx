"use client";

import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/ui/rhf-inputs";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { type UseFormSetValue, useFieldArray } from "react-hook-form";
import {
  type GuideCriterionOption,
  type GuideFormControl,
  type GuideFormValues,
  GuideQuestionItem,
} from "./guide-question-item";
import { GUIDE_SECTION_KIND_OPTIONS } from "./guide-section-kind";

type GuideSectionCardProps = {
  /** Sortable id: the field-array key of the section */
  sortableId: string;
  index: number;
  control: GuideFormControl;
  setValue: UseFormSetValue<GuideFormValues>;
  criteria: GuideCriterionOption[];
  onRemove: () => void;
  disabled?: boolean;
};

const BLANK_QUESTION = {
  text: "",
  followUps: [],
  criterionIds: [],
  anchors: { weak: "", medium: "", strong: "" },
  required: false,
};

/** One sortable section of the interview guide editor. */
export function GuideSectionCard({
  sortableId,
  index,
  control,
  setValue,
  criteria,
  onRemove,
  disabled,
}: GuideSectionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: sortableId });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `sections.${index}.questions`,
    keyName: "fieldKey",
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
          <div className="flex-1 gap-4 grid md:grid-cols-[1fr_14rem_8rem] min-w-0">
            <InputField
              control={control}
              name={`sections.${index}.title`}
              label="Titolo sezione"
            />
            <SelectField
              control={control}
              name={`sections.${index}.kind`}
              label="Tipo"
              options={GUIDE_SECTION_KIND_OPTIONS}
            />
            <InputField
              control={control}
              name={`sections.${index}.minutes`}
              label="Minuti"
              type="number"
              min={1}
              max={240}
              // The schema expects a number: store the numeric value
              onChange={(event) =>
                setValue(
                  `sections.${index}.minutes`,
                  event.currentTarget.valueAsNumber,
                  { shouldDirty: true },
                )
              }
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-7"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Rimuovi sezione"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        {fields.length > 0 && (
          <div className="flex flex-col gap-3">
            {fields.map((field, questionIndex) => (
              <GuideQuestionItem
                key={field.fieldKey}
                control={control}
                sectionIndex={index}
                questionIndex={questionIndex}
                criteria={criteria}
                onRemove={() => remove(questionIndex)}
                onMoveUp={() => move(questionIndex, questionIndex - 1)}
                onMoveDown={() => move(questionIndex, questionIndex + 1)}
                canMoveUp={questionIndex > 0}
                canMoveDown={questionIndex < fields.length - 1}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                ...BLANK_QUESTION,
                followUps: [],
                criterionIds: [],
                anchors: { ...BLANK_QUESTION.anchors },
              })
            }
            disabled={disabled}
          >
            <Plus className="mr-1 size-4" />
            Aggiungi domanda
          </Button>
        </div>
      </div>
    </div>
  );
}
