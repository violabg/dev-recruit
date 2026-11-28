"use client";

import { GUIDE_SECTION_KIND_LABEL } from "@/components/interview-guides/guide-section-kind";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckboxField,
  InputField,
  InputWithTagField,
  MultiSelectField,
  SelectField,
  SwitchField,
  TextareaField,
} from "@/components/ui/rhf-inputs";
import {
  saveInterviewKitAction,
  setInterviewKitStatusAction,
} from "@/lib/actions/interview-kits";
import type { InterviewPreparation } from "@/lib/data/interviews";
import {
  interviewKitEditorSchema,
  type InterviewKitEditorData,
  type InterviewKitProposal,
} from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { type KitFormValues, mergeKitProposal } from "@/lib/utils/kit-proposal";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowUp,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  type Control,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import {
  CHECKLIST_GROUPS,
  getKitItemOriginLabel,
  KIT_STATUS_PRESENTATION,
  MISSING_SOURCE_LABEL,
} from "./interview-presentation";
import { KitGenerationDialog } from "./kit-generation-dialog";

/** Values of the kit form before validation */
type KitEditorFormValues = z.input<typeof interviewKitEditorSchema>;
type KitEditorControl = Control<
  KitEditorFormValues,
  unknown,
  InterviewKitEditorData
>;

type Kit = NonNullable<InterviewPreparation["kit"]>;
type KitCriterion = InterviewPreparation["criteria"][number];

const BRIEFING_POINTS = 5;

/** Form values of a stored kit */
function toFormValues(kit: Kit): KitEditorFormValues {
  return {
    briefing: kit.briefing,
    hypotheses: kit.hypotheses,
    checklist: kit.checklist,
    missingSources: kit.missingSources,
    items: kit.items.map((item) => ({
      id: item.id,
      sectionId: item.sectionId,
      text: item.text,
      followUps: item.followUps,
      criterionIds: item.criterionIds,
      anchors: item.anchors,
      required: item.required,
      origin: item.origin,
      rationale: item.rationale,
      sourceRef: item.sourceRef,
    })),
  };
}

/** Options of a criterion select: active criteria, archived only when already cited */
function criterionOptions(criteria: KitCriterion[], selected: string[]) {
  const known = new Set(criteria.map((criterion) => criterion.id));
  return [
    ...criteria
      .filter(
        (criterion) => !criterion.archived || selected.includes(criterion.id),
      )
      .map((criterion) => ({
        value: criterion.id,
        label: criterion.archived
          ? `${criterion.name} (archiviato)`
          : criterion.name,
      })),
    ...selected
      .filter((id) => id && !known.has(id))
      .map((id) => ({ value: id, label: "Criterio archiviato" })),
  ];
}

type KitEditorProps = {
  interviewId: string;
  applicationId: string;
  /** The interview is scheduled: the kit can change */
  editable: boolean;
  kit: Kit;
  /** Whole scorecard of the position, active and archived */
  criteria: KitCriterion[];
};

/**
 * Preparation editor of an interview kit: briefing, hypotheses, questions by
 * section, checklist. Everything is saved together by "Salva la preparazione";
 * an AI
 * proposal is merged as unsaved changes.
 */
export function KitEditor({
  interviewId,
  editable,
  kit,
  criteria,
}: KitEditorProps) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isChangingStatus, startStatusChange] = useTransition();
  const [generationOpen, setGenerationOpen] = useState(false);

  const values = useMemo(() => toFormValues(kit), [kit]);
  // Edited flag of the stored items (the form never edits it)
  const editedById = useMemo(
    () => new Map(kit.items.map((item) => [item.id, item.edited])),
    [kit],
  );
  // Round of the scorecard cited by a stored previous-round question
  const sourceRoundById = useMemo(
    () => new Map(kit.items.map((item) => [item.id, item.sourceRound])),
    [kit],
  );

  const form = useForm<KitEditorFormValues, unknown, InterviewKitEditorData>({
    resolver: zodResolver(interviewKitEditorSchema),
    values,
  });
  const { control, handleSubmit, formState, setValue, getValues } = form;

  const items = useFieldArray({ control, name: "items", keyName: "fieldKey" });
  const hypotheses = useFieldArray({
    control,
    name: "hypotheses",
    keyName: "fieldKey",
  });
  const checklist = useFieldArray({
    control,
    name: "checklist",
    keyName: "fieldKey",
  });

  const [briefing, missingSources] = useWatch({
    control,
    name: ["briefing", "missingSources"],
  });

  const disabled = !editable || isSaving;
  const busy = isSaving || isChangingStatus;
  const isDirty = formState.isDirty;
  const status = KIT_STATUS_PRESENTATION[kit.status];

  function onSubmit(data: InterviewKitEditorData) {
    startSaving(async () => {
      try {
        unwrap(await saveInterviewKitAction({ ...data, interviewId }));
        toast.success("Preparazione salvata");
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function changeStatus(next: "draft" | "ready") {
    startStatusChange(async () => {
      try {
        unwrap(await setInterviewKitStatusAction({ interviewId, status: next }));
        toast.success(
          next === "ready" ? "Preparazione pronta" : "Preparazione riportata in bozza",
        );
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function onProposal(proposal: InterviewKitProposal) {
    const current = getValues();
    const formValues: KitFormValues = {
      briefing: current.briefing ?? [],
      hypotheses: current.hypotheses ?? [],
      missingSources: current.missingSources ?? [],
      checklist: (current.checklist ?? []).map((entry) => ({
        ...entry,
        done: entry.done ?? false,
      })),
      items: (current.items ?? []).map((item) => ({
        ...item,
        followUps: item.followUps ?? [],
        criterionIds: item.criterionIds ?? [],
        required: item.required ?? false,
        origin: item.origin ?? "manual",
        anchors: item.anchors
          ? {
              weak: item.anchors.weak ?? "",
              medium: item.anchors.medium ?? "",
              strong: item.anchors.strong ?? "",
            }
          : undefined,
        edited: item.id ? (editedById.get(item.id) ?? false) : false,
      })),
    };
    const merged = mergeKitProposal(formValues, proposal, () =>
      crypto.randomUUID(),
    );
    const dirty = { shouldDirty: true, shouldValidate: false };
    setValue("briefing", merged.briefing, dirty);
    setValue("hypotheses", merged.hypotheses, dirty);
    setValue("checklist", merged.checklist, dirty);
    setValue("missingSources", merged.missingSources, dirty);
    setValue(
      "items",
      merged.items.map((item) => ({
        id: item.id,
        sectionId: item.sectionId,
        text: item.text,
        followUps: item.followUps,
        criterionIds: item.criterionIds,
        anchors: item.anchors,
        required: item.required,
        origin: item.origin,
        rationale: item.rationale,
        sourceRef: item.sourceRef,
      })),
      dirty,
    );
  }

  /** Moves an item before/after the previous/next item of the same section */
  function moveWithinSection(index: number, direction: -1 | 1) {
    const sectionId = items.fields[index]?.sectionId;
    let target = index + direction;
    while (
      target >= 0 &&
      target < items.fields.length &&
      items.fields[target].sectionId !== sectionId
    ) {
      target += direction;
    }
    if (target < 0 || target >= items.fields.length) return;
    items.swap(index, target);
  }

  const briefingPoints = briefing ?? [];

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
        noValidate
      >
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={status.badge}>{status.label}</Badge>
            {isDirty && (
              <span className="bg-warning/10 px-2 py-1 rounded-md text-warning text-sm">
                Modifiche non salvate
              </span>
            )}
          </div>
          {editable && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setGenerationOpen(true)}
              >
                <BrainCircuit className="size-4" />
                Genera con AI
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Salva la preparazione
              </Button>
              {kit.status === "draft" ? (
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  disabled={busy || isDirty}
                  onClick={() => changeStatus("ready")}
                >
                  <CheckCircle2 className="size-4" />
                  Segna come pronta
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || isDirty}
                  onClick={() => changeStatus("draft")}
                >
                  <RotateCcw className="size-4" />
                  Riporta in bozza
                </Button>
              )}
            </div>
          )}
        </div>

        {!editable && (
          <p className="bg-muted px-3 py-2 rounded-md text-muted-foreground text-sm">
            La preparazione si modifica solo prima del colloquio
          </p>
        )}
        {editable && isDirty && (
          <p className="text-muted-foreground text-xs">
            Salva prima le modifiche per cambiare lo stato della preparazione.
          </p>
        )}

        {(missingSources ?? []).length > 0 && (
          <p className="text-muted-foreground text-sm">
            Fonti mancanti:{" "}
            {(missingSources ?? [])
              .map((source) => MISSING_SOURCE_LABEL[source])
              .join(", ")}
          </p>
        )}

        <fieldset disabled={disabled} className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Briefing</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {briefingPoints.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Nessun punto di briefing.
                </p>
              )}
              {briefingPoints.map((_, index) => (
                <div
                  key={`briefing-${index}`}
                  className="items-start gap-2 grid grid-cols-[1fr_auto]"
                >
                  <TextareaField
                    control={control}
                    name={`briefing.${index}`}
                    label={`Punto ${index + 1}`}
                    className="min-h-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="mt-6"
                    aria-label="Rimuovi punto"
                    disabled={disabled}
                    onClick={() =>
                      setValue(
                        "briefing",
                        briefingPoints.filter((__, i) => i !== index),
                        { shouldDirty: true },
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {editable && briefingPoints.length < BRIEFING_POINTS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  disabled={disabled}
                  onClick={() =>
                    setValue("briefing", [...briefingPoints, ""], {
                      shouldDirty: true,
                    })
                  }
                >
                  <Plus className="size-4" />
                  Aggiungi punto
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ipotesi da verificare</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {hypotheses.fields.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Nessuna ipotesi.
                </p>
              )}
              {hypotheses.fields.map((field, index) => (
                <HypothesisRow
                  key={field.fieldKey}
                  control={control}
                  index={index}
                  criteria={criteria}
                  disabled={disabled}
                  onRemove={() => hypotheses.remove(index)}
                />
              ))}
              {editable && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  disabled={disabled}
                  onClick={() =>
                    hypotheses.append({
                      criterionId: "",
                      hypothesis: "",
                      howToVerify: "",
                    })
                  }
                >
                  <Plus className="size-4" />
                  Aggiungi ipotesi
                </Button>
              )}
            </CardContent>
          </Card>

          {kit.sections.map((section) => {
            const sectionItems = items.fields
              .map((field, index) => ({ field, index }))
              .filter(({ field }) => field.sectionId === section.id);
            return (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {section.title}
                    <span className="font-normal text-muted-foreground text-sm">
                      {GUIDE_SECTION_KIND_LABEL[section.kind]} ·{" "}
                      {section.minutes} min
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {sectionItems.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      Nessuna domanda in questa sezione.
                    </p>
                  )}
                  {sectionItems.map(({ field, index }, position) => (
                    <KitItemRow
                      key={field.fieldKey}
                      control={control}
                      index={index}
                      number={position + 1}
                      criteria={criteria}
                      edited={field.id ? (editedById.get(field.id) ?? false) : false}
                      sourceRound={
                        field.id ? (sourceRoundById.get(field.id) ?? null) : null
                      }
                      disabled={disabled}
                      canMoveUp={position > 0}
                      canMoveDown={position < sectionItems.length - 1}
                      onMoveUp={() => moveWithinSection(index, -1)}
                      onMoveDown={() => moveWithinSection(index, 1)}
                      onRemove={() => items.remove(index)}
                    />
                  ))}
                  {editable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      disabled={disabled}
                      onClick={() => {
                        // Appended after the last item of the section
                        const last = sectionItems.at(-1)?.index;
                        const row = {
                          sectionId: section.id,
                          origin: "manual" as const,
                          text: "",
                          followUps: [],
                          criterionIds: [],
                          required: false,
                        };
                        if (last === undefined) items.append(row);
                        else items.insert(last + 1, row);
                      }}
                    >
                      <Plus className="size-4" />
                      Aggiungi domanda
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
            </CardHeader>
            <CardContent className="gap-6 grid md:grid-cols-2">
              {CHECKLIST_GROUPS.map((group) => (
                <div key={group.category} className="flex flex-col gap-3">
                  <span className="font-medium text-sm">{group.title}</span>
                  {checklist.fields
                    .map((field, index) => ({ field, index }))
                    .filter(({ field }) => field.category === group.category)
                    .map(({ field, index }) => (
                      <div
                        key={field.fieldKey}
                        className="items-center gap-2 grid grid-cols-[auto_1fr_auto]"
                      >
                        <CheckboxField
                          control={control}
                          name={`checklist.${index}.done`}
                          aria-label="Fatto"
                          disabled={disabled}
                        />
                        <InputField
                          control={control}
                          name={`checklist.${index}.text`}
                          aria-label="Voce della checklist"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Rimuovi voce"
                          disabled={disabled}
                          onClick={() => checklist.remove(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  {editable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      disabled={disabled}
                      onClick={() =>
                        checklist.append({
                          id: crypto.randomUUID(),
                          category: group.category,
                          text: "",
                          done: false,
                        })
                      }
                    >
                      <Plus className="size-4" />
                      Aggiungi voce
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </fieldset>
      </form>

      {editable && generationOpen && (
        <KitGenerationDialog
          open={generationOpen}
          onOpenChange={setGenerationOpen}
          interviewId={interviewId}
          onProposal={onProposal}
        />
      )}
    </>
  );
}

// ====================
// ROWS
// ====================

function HypothesisRow({
  control,
  index,
  criteria,
  disabled,
  onRemove,
}: {
  control: KitEditorControl;
  index: number;
  criteria: KitCriterion[];
  disabled: boolean;
  onRemove: () => void;
}) {
  const criterionId =
    useWatch({ control, name: `hypotheses.${index}.criterionId` }) ?? "";

  return (
    <div className="flex flex-col gap-3 bg-muted/30 p-4 border border-border/50 rounded-lg">
      <div className="items-end gap-2 grid grid-cols-[1fr_auto]">
        <SelectField
          control={control}
          name={`hypotheses.${index}.criterionId`}
          label="Criterio"
          placeholder="Seleziona un criterio"
          options={criterionOptions(criteria, criterionId ? [criterionId] : [])}
          triggerProps={{ disabled }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Rimuovi ipotesi"
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <TextareaField
        control={control}
        name={`hypotheses.${index}.hypothesis`}
        label="Ipotesi"
        className="bg-background min-h-12"
      />
      <TextareaField
        control={control}
        name={`hypotheses.${index}.howToVerify`}
        label="Come verificarla"
        className="bg-background min-h-12"
      />
    </div>
  );
}

function KitItemRow({
  control,
  index,
  number,
  criteria,
  edited,
  sourceRound,
  disabled,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  control: KitEditorControl;
  index: number;
  number: number;
  criteria: KitCriterion[];
  edited: boolean;
  /** Round of the cited scorecard, for previous-round questions */
  sourceRound: number | null;
  disabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const base = `items.${index}` as const;
  const [origin, rationale, selectedCriterionIds] = useWatch({
    control,
    name: [`${base}.origin`, `${base}.rationale`, `${base}.criterionIds`],
  });
  const originKey = origin ?? "manual";

  return (
    <div className="flex flex-col gap-4 bg-muted/30 p-4 border border-border/50 rounded-lg">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">Domanda {number}</span>
          <Badge variant="outline">
            {getKitItemOriginLabel(originKey, sourceRound)}
          </Badge>
          {edited && (
            <span className="text-muted-foreground text-xs">ritoccata</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveUp}
            disabled={disabled || !canMoveUp}
            aria-label="Su"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveDown}
            disabled={disabled || !canMoveDown}
            aria-label="Giù"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Rimuovi"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {rationale && (
        <p className="text-muted-foreground text-sm">Perché: {rationale}</p>
      )}

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
        options={criterionOptions(criteria, selectedCriterionIds ?? [])}
        placeholder="Seleziona i criteri..."
      />

      <SwitchField
        control={control}
        name={`${base}.required`}
        label="Obbligatoria"
      />
    </div>
  );
}
