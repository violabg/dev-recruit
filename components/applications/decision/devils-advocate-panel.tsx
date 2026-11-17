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
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { LLMModelSelect } from "@/components/ui/llm-model-select";
import { challengeDecisionAction } from "@/lib/actions/application-decisions";
import type {
  DecisionChallengeReason,
  DecisionOutcomeValue,
} from "@/lib/schemas";
import { DEFAULT_GENERATION_MODEL } from "@/lib/services/ai/models";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export type DevilsAdvocatePanelProps = {
  applicationId: string;
  draft: { outcome: DecisionOutcomeValue | null; rationale: string };
  /** Criterion id -> name */
  criteriaById: Record<string, string>;
};

/**
 * AI devil's advocate: reasons why the outcome selected in the form could be
 * wrong. The proposal lives only in this component: nothing is saved.
 */
export function DevilsAdvocatePanel({
  applicationId,
  draft,
  criteriaById,
}: DevilsAdvocatePanelProps) {
  const [isPending, startTransition] = useTransition();
  const [specificModel, setSpecificModel] = useState<string>(
    DEFAULT_GENERATION_MODEL,
  );
  const [reasons, setReasons] = useState<DecisionChallengeReason[] | null>(
    null,
  );

  function challenge() {
    const outcome = draft.outcome;
    if (!outcome) return;

    startTransition(async () => {
      try {
        const { challenge } = unwrap(
          await challengeDecisionAction({
            applicationId,
            outcome,
            rationale: draft.rationale || undefined,
            specificModel,
          }),
        );
        setReasons(challenge.reasons);
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avvocato del diavolo</CardTitle>
        <CardDescription>
          Motivi per cui la decisione potrebbe essere sbagliata
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field>
          <FieldLabel>Modello LLM</FieldLabel>
          <FieldContent>
            <LLMModelSelect
              value={specificModel}
              onValueChange={setSpecificModel}
            />
          </FieldContent>
        </Field>

        <div className="flex flex-col items-start gap-1">
          <Button
            type="button"
            onClick={challenge}
            disabled={!draft.outcome || isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BrainCircuit className="size-4" />
            )}
            Chiedi all&apos;avvocato del diavolo
          </Button>
          {!draft.outcome && (
            <p className="text-muted-foreground text-xs">
              Scegli un esito per ricevere i controargomenti
            </p>
          )}
        </div>

        {reasons !== null &&
          (reasons.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nessun controargomento proposto
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {reasons.map((reason, index) => (
                <li key={index} className="flex flex-col gap-1">
                  <span className="font-medium">{reason.title}</span>
                  <p className="text-sm">{reason.explanation}</p>
                  {reason.criterionIds.some((id) => id in criteriaById) && (
                    <div className="flex flex-wrap gap-1">
                      {reason.criterionIds
                        .filter((id) => id in criteriaById)
                        .map((id) => (
                          <Badge key={id} variant="outline">
                            {criteriaById[id]}
                          </Badge>
                        ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ))}

        <p className="text-muted-foreground text-xs">
          Proposta AI: non viene salvata
        </p>
      </CardContent>
    </Card>
  );
}
