"use client";

import { CRITERION_PRIORITY_PRESENTATION } from "@/components/scorecard/criterion-presentation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputWithTagField,
  SelectField,
  TextareaField,
} from "@/components/ui/rhf-inputs";
import {
  saveInterviewerFeedbackAction,
  submitInterviewerFeedbackAction,
} from "@/lib/actions/interviewer-feedback";
import {
  HIRE_RECOMMENDATION_VALUES,
  interviewerFeedbackFormSchema,
  type CriterionPriority,
  type InterviewerFeedbackFormData,
} from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { formatInterviewDateTime } from "@/lib/utils/interview-calendar";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { HIRE_RECOMMENDATION_LABEL } from "./interview-presentation";

type FeedbackFormValues = z.input<typeof interviewerFeedbackFormSchema>;

const SCORES = [1, 2, 3, 4, 5] as const;

const RECOMMENDATION_OPTIONS = HIRE_RECOMMENDATION_VALUES.map((value) => ({
  value,
  label: HIRE_RECOMMENDATION_LABEL[value],
}));

export type FeedbackCriterion = {
  id: string;
  name: string;
  priority: CriterionPriority;
  archived: boolean;
};

type InterviewerFeedbackFormProps = {
  interviewId: string;
  /** Rows of the form, in the order of initial.scores */
  criteria: FeedbackCriterion[];
  initial: InterviewerFeedbackFormData;
  /** When set the scorecard is submitted and read-only for everybody */
  submittedAt: Date | null;
  interviewCompleted: boolean;
};

/**
 * Scorecard of the signed-in interviewer: one score 1-5 (or no evidence) and
 * evidence per criterion, final recommendation, notes, red flags and
 * standout moments. Draft save at any time; submission once the interview is
 * completed, after which nobody can change it.
 */
export function InterviewerFeedbackForm({
  interviewId,
  criteria,
  initial,
  submittedAt,
  interviewCompleted,
}: InterviewerFeedbackFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const submitted = submittedAt !== null;
  const disabled = submitted || isPending;

  const form = useForm<FeedbackFormValues, unknown, InterviewerFeedbackFormData>(
    {
      resolver: zodResolver(interviewerFeedbackFormSchema),
      values: initial,
    },
  );
  const { control, handleSubmit } = form;

  function saveDraft(data: InterviewerFeedbackFormData) {
    startTransition(async () => {
      try {
        unwrap(await saveInterviewerFeedbackAction({ ...data, interviewId }));
        toast.success("Bozza salvata");
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function submit(data: InterviewerFeedbackFormData) {
    startTransition(async () => {
      try {
        const { stageChanged } = unwrap(
          await submitInterviewerFeedbackAction({ ...data, interviewId }),
        );
        toast.success("Scheda inviata");
        if (stageChanged) {
          toast.success(
            "Tutte le schede sono inviate: la candidatura passa a Decisione",
          );
        }
        setConfirmSubmit(false);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(saveDraft)}
      className="flex flex-col gap-6"
      noValidate
    >
      {submitted && submittedAt && (
        <div>
          <Badge className="bg-success/10 text-success">
            Inviata il {formatInterviewDateTime(submittedAt)}
          </Badge>
        </div>
      )}

      <fieldset disabled={disabled} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Valutazione per criterio</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {criteria.length === 0 && (
              <p className="text-muted-foreground text-sm">
                La scheda di valutazione della posizione non ha criteri.
              </p>
            )}
            {criteria.map((criterion, index) => {
              const priority =
                CRITERION_PRIORITY_PRESENTATION[criterion.priority];
              return (
                <div
                  key={criterion.id}
                  className="flex flex-col gap-3 pb-5 last:pb-0 border-b last:border-b-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">
                      {criterion.name}
                      {criterion.archived ? " (archiviato)" : ""}
                    </span>
                    <Badge className={priority.className}>
                      {priority.label}
                    </Badge>
                  </div>
                  <Controller
                    control={control}
                    name={`scores.${index}.score`}
                    render={({ field }) => (
                      <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label={`Voto per ${criterion.name}`}
                      >
                        {SCORES.map((score) => (
                          <Button
                            key={score}
                            type="button"
                            size="sm"
                            variant={field.value === score ? "default" : "outline"}
                            aria-pressed={field.value === score}
                            disabled={disabled}
                            onClick={() => field.onChange(score)}
                          >
                            {score}
                          </Button>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant={field.value === null ? "secondary" : "outline"}
                          aria-pressed={field.value === null}
                          disabled={disabled}
                          onClick={() => field.onChange(null)}
                        >
                          Senza prove
                        </Button>
                      </div>
                    )}
                  />
                  <TextareaField
                    control={control}
                    name={`scores.${index}.evidence`}
                    label="Evidenze"
                    className="min-h-16"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Giudizio complessivo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SelectField
              control={control}
              name="hireRecommendation"
              label="Raccomandazione finale"
              placeholder="Seleziona una raccomandazione"
              options={RECOMMENDATION_OPTIONS}
              triggerProps={{ disabled }}
            />
            <TextareaField
              control={control}
              name="notes"
              label="Note"
              className="min-h-24"
            />
            <InputWithTagField
              control={control}
              name="redFlags"
              label="Segnali d'allarme"
              placeholder="Scrivi un segnale e premi Invio"
            />
            <InputWithTagField
              control={control}
              name="standoutMoments"
              label="Momenti di rilievo"
              placeholder="Scrivi un momento e premi Invio"
            />
          </CardContent>
        </Card>
      </fieldset>

      {!submitted && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="outline" disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salva bozza
          </Button>
          <Button
            type="button"
            disabled={isPending || !interviewCompleted}
            onClick={() => setConfirmSubmit(true)}
          >
            <Send className="size-4" />
            Invia scheda
          </Button>
          {!interviewCompleted && (
            <span className="text-muted-foreground text-sm">
              Disponibile a colloquio concluso
            </span>
          )}
        </div>
      )}

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inviare la scheda?</AlertDialogTitle>
            <AlertDialogDescription>
              Dopo l&apos;invio la scheda non è più modificabile da nessuno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Indietro</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => void handleSubmit(submit)()}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Invia scheda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
