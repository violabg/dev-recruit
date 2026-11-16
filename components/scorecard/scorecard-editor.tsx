"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LLMModelSelect } from "@/components/ui/llm-model-select";
import {
  generateScorecardCriteriaAction,
  saveScorecardAction,
} from "@/lib/actions/scorecards";
import type { ScorecardCriterionView } from "@/lib/data/scorecards";
import {
  saveScorecardSchema,
  type SaveScorecardInput,
  type ScorecardCriterionInput,
} from "@/lib/schemas";
import { DEFAULT_GENERATION_MODEL } from "@/lib/services/ai/models";
import { formatDate } from "@/lib/utils";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { DEFAULT_SOFT_CRITERIA } from "@/lib/utils/scorecard-defaults";
import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { zodResolver } from "@hookform/resolvers/zod";
import { BrainCircuit, Loader2, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  CRITERION_CATEGORY_LABEL,
  CRITERION_PRIORITY_PRESENTATION,
} from "./criterion-presentation";
import { CriterionRow, type ScorecardFormValues } from "./criterion-row";

type ScorecardEditorProps = {
  positionId: string;
  criteria: ScorecardCriterionView[];
  archivedCriteria: ScorecardCriterionView[];
};

const noopSubscribe = () => () => {};

const normalizeName = (name: string) => name.trim().toLowerCase();

function toFormRow(criterion: ScorecardCriterionView): ScorecardCriterionInput {
  return {
    id: criterion.id,
    name: criterion.name,
    description: criterion.description ?? "",
    category: criterion.category,
    priority: criterion.priority,
    weight: criterion.weight,
    expectedLevel: criterion.expectedLevel,
    anchors: { ...criterion.anchors },
    source: criterion.source,
  };
}

const BLANK_CRITERION: ScorecardCriterionInput = {
  name: "",
  description: "",
  category: "technical",
  priority: "must",
  weight: 3,
  expectedLevel: 3,
  anchors: { weak: "", medium: "", strong: "" },
  source: "custom",
};

/**
 * Editor of the scorecard of a position. Nothing is saved before "Salva
 * scheda": the default soft criteria and the AI proposal are unsaved rows.
 */
export function ScorecardEditor({
  positionId,
  criteria,
  archivedCriteria,
}: ScorecardEditorProps) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isGenerating, startGenerating] = useTransition();
  const [specificModel, setSpecificModel] = useState<string>(
    DEFAULT_GENERATION_MODEL,
  );

  const hasSavedCriteria = criteria.length > 0;

  // Saved criteria, or the default soft criteria when none is saved. Passed
  // as `values` so the form follows the server data after a save (the new
  // rows get their ids and are not created twice).
  const values = useMemo<ScorecardFormValues>(
    () => ({
      positionId,
      criteria: hasSavedCriteria
        ? criteria.map(toFormRow)
        : DEFAULT_SOFT_CRITERIA.map((criterion) => ({
            ...criterion,
            anchors: { ...criterion.anchors },
          })),
    }),
    [positionId, criteria, hasSavedCriteria],
  );

  const form = useForm<ScorecardFormValues, unknown, SaveScorecardInput>({
    resolver: zodResolver(saveScorecardSchema),
    values,
  });
  const { control, handleSubmit, formState, getValues } = form;

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "criteria",
    keyName: "fieldKey",
  });

  // With nothing saved, any row on screen is an unsaved change
  const hasUnsavedChanges = hasSavedCriteria
    ? formState.isDirty
    : fields.length > 0;

  // Enable drag and drop only on the client (avoids hydration mismatches)
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const isPending = isSaving || isGenerating;

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((field) => field.fieldKey === active.id);
    const to = fields.findIndex((field) => field.fieldKey === over.id);
    if (from === -1 || to === -1) return;
    move(from, to);
  }

  function onGenerate() {
    startGenerating(async () => {
      try {
        const { criteria: proposed } = unwrap(
          await generateScorecardCriteriaAction({ positionId, specificModel }),
        );

        const present = new Set(
          getValues("criteria").map((row) => normalizeName(row.name)),
        );
        const added: ScorecardCriterionInput[] = [];
        for (const criterion of proposed) {
          const name = normalizeName(criterion.name);
          if (!name || present.has(name)) continue;
          present.add(name);
          added.push({
            ...criterion,
            description: criterion.description ?? "",
          });
        }

        if (added.length === 0) {
          toast.success("Nessun nuovo criterio proposto");
          return;
        }

        append(added);
        toast.success(
          added.length === 1
            ? "1 criterio proposto aggiunto"
            : `${added.length} criteri proposti aggiunti`,
        );
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function onSubmit(data: SaveScorecardInput) {
    startSaving(async () => {
      try {
        unwrap(await saveScorecardAction(data));
        toast.success("Scheda di valutazione salvata");
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  const rows = fields.map((field, index) => (
    <CriterionRow
      key={field.fieldKey}
      sortableId={field.fieldKey}
      index={index}
      control={control}
      onRemove={() => remove(index)}
      disabled={isPending}
    />
  ));

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-80 max-w-full">
              <LLMModelSelect
                value={specificModel}
                onValueChange={(value) =>
                  setSpecificModel(value || DEFAULT_GENERATION_MODEL)
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onGenerate}
              disabled={isPending}
            >
              {isGenerating ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <BrainCircuit className="mr-1 size-4" />
              )}
              Proponi criteri con AI
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                ...BLANK_CRITERION,
                anchors: { ...BLANK_CRITERION.anchors },
              })
            }
            disabled={isPending}
          >
            <Plus className="mr-1 size-4" />
            Aggiungi criterio
          </Button>
        </div>

        {!hasSavedCriteria && fields.length > 0 && (
          <p className="bg-warning/10 px-3 py-2 rounded-md text-warning text-sm">
            Criteri soft di default: non sono ancora salvati
          </p>
        )}

        {fields.length === 0 ? (
          <p className="py-8 border border-dashed rounded-lg text-muted-foreground text-sm text-center">
            Nessun criterio. Aggiungine uno o chiedi una proposta all&apos;AI.
          </p>
        ) : mounted ? (
          <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={fields.map((field) => field.fieldKey)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3">{rows}</div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col gap-3">{rows}</div>
        )}

        <div className="flex flex-wrap justify-end items-center gap-3">
          {hasUnsavedChanges && (
            <span className="bg-warning/10 px-2 py-1 rounded-md text-warning text-sm">
              Modifiche non salvate
            </span>
          )}
          <Button type="submit" disabled={isPending}>
            {isSaving ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Save className="mr-1 size-4" />
            )}
            Salva scheda
          </Button>
        </div>
      </form>

      {archivedCriteria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Criteri archiviati</CardTitle>
            <CardDescription>
              Criteri rimossi dalla scheda ma conservati perché hanno già
              valutazioni.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {archivedCriteria.map((criterion) => (
                <li
                  key={criterion.id}
                  className="flex flex-wrap justify-between items-center gap-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{criterion.name}</span>
                    <Badge variant="outline">
                      {CRITERION_CATEGORY_LABEL[criterion.category]}
                    </Badge>
                    <Badge
                      className={
                        CRITERION_PRIORITY_PRESENTATION[criterion.priority]
                          .className
                      }
                    >
                      {CRITERION_PRIORITY_PRESENTATION[criterion.priority].label}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground">
                    Archiviato il{" "}
                    {formatDate(
                      criterion.archivedAt
                        ? new Date(criterion.archivedAt).toISOString()
                        : null,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
