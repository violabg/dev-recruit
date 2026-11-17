"use client";

import { Button } from "@/components/ui/button";
import { SelectField, TextareaField } from "@/components/ui/rhf-inputs";
import { recordApplicationDecisionAction } from "@/lib/actions/application-decisions";
import {
  recordApplicationDecisionSchema,
  type DecisionOutcomeValue,
  type RecordApplicationDecisionInput,
} from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import type { MustWarning } from "@/lib/utils/decision-score";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { DecisionCollapsible } from "./decision-interview-columns-toggle";
import {
  DECISION_OUTCOME_OPTIONS,
  mustWarningText,
} from "./decision-presentation";

export type DecisionFormProps = {
  applicationId: string;
  warnings: MustWarning[];
  /** Interviews whose scores stay collapsed for the viewer */
  collapsedInterviewIds: string[];
  initial: {
    outcome: DecisionOutcomeValue | null;
    rationale: string | null;
  };
  disabledReason: string | null;
  onDraftChange?: (draft: {
    outcome: DecisionOutcomeValue | null;
    rationale: string;
  }) => void;
};

type DecisionFormValues = z.input<typeof recordApplicationDecisionSchema>;

/**
 * Decision form: outcome and rationale. Recording it saves the decision with
 * the weights in use and advances the stage.
 */
export function DecisionForm({
  applicationId,
  warnings,
  collapsedInterviewIds,
  initial,
  disabledReason,
  onDraftChange,
}: DecisionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const disabled = disabledReason !== null || isPending;

  const form = useForm<
    DecisionFormValues,
    unknown,
    RecordApplicationDecisionInput
  >({
    resolver: zodResolver(recordApplicationDecisionSchema),
    // No outcome until the user picks one: the schema rejects an empty value
    values: {
      applicationId,
      outcome: initial.outcome ?? undefined,
      rationale: initial.rationale ?? "",
    } as DecisionFormValues,
  });
  const { control, handleSubmit } = form;

  const outcome = useWatch({ control, name: "outcome" });
  const rationale = useWatch({ control, name: "rationale" });

  useEffect(() => {
    onDraftChange?.({
      outcome: outcome ?? null,
      rationale: rationale ?? "",
    });
  }, [outcome, rationale, onDraftChange]);

  function onSubmit(values: RecordApplicationDecisionInput) {
    startTransition(async () => {
      try {
        unwrap(await recordApplicationDecisionAction(values));
        toast.success("Decisione registrata");
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <SelectField
        control={control}
        name="outcome"
        label="Esito"
        placeholder="Seleziona un esito"
        options={DECISION_OUTCOME_OPTIONS}
        triggerProps={{ disabled }}
        required
      />

      {warnings.length > 0 && (
        <div className="bg-warning/10 px-3 py-2 rounded-md text-warning text-sm">
          <p className="font-medium">Da motivare</p>
          <p>
            La motivazione della decisione deve affrontare esplicitamente
            questi punti
          </p>
          <DecisionCollapsible
            interviewIds={collapsedInterviewIds}
            placeholder="Visibile dopo l'invio della tua scheda"
          >
            <ul className="mt-1 pl-5 list-disc">
              {warnings.map((warning) => (
                <li key={warning.criterionId}>{mustWarningText(warning)}</li>
              ))}
            </ul>
          </DecisionCollapsible>
        </div>
      )}

      <TextareaField
        control={control}
        name="rationale"
        label="Motivazione"
        placeholder="Spiega la decisione, citando le prove della matrice"
        className="min-h-32"
        maxLength={5000}
        disabled={disabled}
        required
      />

      {disabledReason && (
        <p className="text-muted-foreground text-sm">{disabledReason}</p>
      )}

      <div>
        <Button type="submit" disabled={disabled}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Registra decisione
        </Button>
      </div>
    </form>
  );
}
