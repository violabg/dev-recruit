"use client";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/rhf-inputs";
import { upsertInterviewGuideAction } from "@/lib/actions/interview-guides";
import {
  interviewGuideEditorSchema,
  type GeneratedInterviewGuide,
  type GuideSectionInput,
  type InterviewGuideEditorData,
} from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { BrainCircuit, Loader2, Plus, Save } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { GuideGenerationDialog } from "./guide-generation-dialog";
import {
  type GuideCriterionOption,
  type GuideFormValues,
} from "./guide-question-item";
import { GuideSectionCard } from "./guide-section-card";

type InterviewGuideEditorProps = {
  mode: "create" | "edit";
  positionId: string;
  guide: {
    id?: string;
    title: string;
    round: number;
    durationMinutes: number;
    sections: GuideSectionInput[];
  };
  /** Active criteria of the scorecard, plus the archived ones in use */
  criteria: GuideCriterionOption[];
};

const noopSubscribe = () => () => {};

const BLANK_SECTION: GuideSectionInput = {
  title: "",
  minutes: 10,
  kind: "technical",
  questions: [],
};

/**
 * Editor of an interview guide: details, ordered sections and questions,
 * "Genera dalla scheda". Nothing is saved before "Salva guida".
 */
export function InterviewGuideEditor({
  mode,
  positionId,
  guide,
  criteria,
}: InterviewGuideEditorProps) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [generationOpen, setGenerationOpen] = useState(false);

  // Passed as `values` so the form follows the server data after a save
  // (created sections and questions get their ids and are not duplicated)
  const values = useMemo<GuideFormValues>(
    () => ({
      title: guide.title,
      round: guide.round,
      durationMinutes: guide.durationMinutes,
      sections: guide.sections,
    }),
    [guide],
  );

  const form = useForm<GuideFormValues, unknown, InterviewGuideEditorData>({
    resolver: zodResolver(interviewGuideEditorSchema),
    values,
  });
  const { control, handleSubmit, formState, setValue } = form;

  const { fields, append, remove, move, replace } = useFieldArray({
    control,
    name: "sections",
    keyName: "fieldKey",
  });

  const [title, round, durationMinutes, sections] = useWatch({
    control,
    name: ["title", "round", "durationMinutes", "sections"],
  });

  const sectionMinutes = (sections ?? []).reduce(
    (total, section) =>
      total + (Number.isFinite(section?.minutes) ? Number(section.minutes) : 0),
    0,
  );
  const minutesMismatch = sectionMinutes !== Number(durationMinutes);

  const hasActiveCriteria = criteria.some((criterion) => !criterion.archived);

  // Enable drag and drop only on the client (avoids hydration mismatches)
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((field) => field.fieldKey === active.id);
    const to = fields.findIndex((field) => field.fieldKey === over.id);
    if (from === -1 || to === -1) return;
    move(from, to);
  }

  function onGenerated(generated: GeneratedInterviewGuide) {
    // Replaces the sections as unsaved changes
    replace(generated.sections);
    toast.success("Guida generata", {
      description:
        "Rivedi sezioni e domande e premi Salva guida per confermare.",
    });
  }

  function numberOnChange(name: "round" | "durationMinutes") {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setValue(name, event.currentTarget.valueAsNumber, { shouldDirty: true });
  }

  function onSubmit(data: InterviewGuideEditorData) {
    startSaving(async () => {
      try {
        const { id } = unwrap(
          await upsertInterviewGuideAction({
            ...data,
            ...(mode === "edit" ? { guideId: guide.id } : { positionId }),
          }),
        );
        toast.success("Guida salvata");
        if (mode === "create") {
          router.push(
            `/dashboard/positions/${positionId}/guides/${id}` as Route<`/dashboard/positions/${string}/guides/${string}`>,
          );
        } else {
          router.refresh();
        }
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  const sectionCards = fields.map((field, index) => (
    <GuideSectionCard
      key={field.fieldKey}
      sortableId={field.fieldKey}
      index={index}
      control={control}
      setValue={setValue}
      criteria={criteria}
      onRemove={() => remove(index)}
      disabled={isSaving}
    />
  ));

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
        noValidate
      >
        <div className="gap-4 grid md:grid-cols-[1fr_8rem_10rem]">
          <InputField control={control} name="title" label="Titolo" />
          <InputField
            control={control}
            name="round"
            label="Round"
            type="number"
            min={1}
            max={10}
            onChange={numberOnChange("round")}
          />
          <InputField
            control={control}
            name="durationMinutes"
            label="Durata (minuti)"
            type="number"
            min={10}
            max={480}
            onChange={numberOnChange("durationMinutes")}
          />
        </div>

        <div className="flex flex-wrap justify-between items-center gap-4">
          <span
            className={cn(
              "px-2 py-1 rounded-md text-sm",
              minutesMismatch
                ? "bg-warning/10 text-warning"
                : "text-muted-foreground",
            )}
          >
            Somma sezioni: {sectionMinutes} min su{" "}
            {Number.isFinite(Number(durationMinutes)) ? durationMinutes : 0}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col items-end gap-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGenerationOpen(true)}
                disabled={isSaving || !hasActiveCriteria}
              >
                <BrainCircuit className="mr-1 size-4" />
                Genera dalla scheda
              </Button>
              {!hasActiveCriteria && (
                <span className="text-muted-foreground text-xs">
                  Crea prima la scheda di valutazione
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({ ...BLANK_SECTION, questions: [] })
              }
              disabled={isSaving}
            >
              <Plus className="mr-1 size-4" />
              Aggiungi sezione
            </Button>
          </div>
        </div>

        {fields.length === 0 ? (
          <p className="py-8 border border-dashed rounded-lg text-muted-foreground text-sm text-center">
            Nessuna sezione. Aggiungine una o genera la guida dalla scheda.
          </p>
        ) : mounted ? (
          <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={fields.map((field) => field.fieldKey)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-4">{sectionCards}</div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col gap-4">{sectionCards}</div>
        )}

        <div className="flex flex-wrap justify-end items-center gap-3">
          {formState.isDirty && (
            <span className="bg-warning/10 px-2 py-1 rounded-md text-warning text-sm">
              Modifiche non salvate
            </span>
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Save className="mr-1 size-4" />
            )}
            Salva guida
          </Button>
        </div>
      </form>

      <GuideGenerationDialog
        open={generationOpen}
        onOpenChange={setGenerationOpen}
        positionId={positionId}
        title={title ?? ""}
        round={Number(round)}
        durationMinutes={Number(durationMinutes)}
        hasContent={fields.length > 0}
        onGenerated={onGenerated}
      />
    </>
  );
}
