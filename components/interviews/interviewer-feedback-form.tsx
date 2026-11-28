"use client";

import {
  BlockLabel,
  ChapterHeader,
  Stat,
  StatGrid,
} from "@/components/detail-blocks";
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
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "cn";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
        toast.success("Feedback inviato");
        if (stageChanged) {
          toast.success(
            "Tutti i feedback sono inviati: la candidatura passa a Decisione",
          );
        }
        setConfirmSubmit(false);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  const scores = useWatch({ control, name: "scores" }) ?? [];
  const recommendation = useWatch({ control, name: "hireRecommendation" });
  const scoredCount = scores.filter((row) => row?.score != null).length;

  return (
    <form
      onSubmit={handleSubmit(saveDraft)}
      className="flex flex-col gap-8"
      noValidate
    >
      {/* Where the scorecard stands */}
      <Card size="sm">
        <CardContent className="flex flex-col gap-3">
          <StatGrid>
            <Stat
              value={`${scoredCount}/${criteria.length}`}
              label="criteri con voto"
              tone={
                criteria.length > 0 && scoredCount === criteria.length
                  ? "success"
                  : undefined
              }
            />
            <Stat
              value={criteria.length - scoredCount}
              label="senza prove"
            />
            <Stat
              value={
                recommendation
                  ? HIRE_RECOMMENDATION_LABEL[recommendation]
                  : "—"
              }
              label="raccomandazione"
            />
            <Stat
              value={submitted ? "Inviata" : "Bozza"}
              label={
                submitted && submittedAt
                  ? formatInterviewDateTime(submittedAt)
                  : "stato del feedback"
              }
              tone={submitted ? "success" : "warning"}
            />
          </StatGrid>
        </CardContent>
      </Card>

      <fieldset disabled={disabled} className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <ChapterHeader
            number={1}
            title="Voti per criterio"
            meta="Voto 1–5 con le evidenze, oppure Senza prove"
          />
          {criteria.length === 0 && (
            <p className="py-2 text-muted-foreground text-sm">
              La posizione non ha criteri.
            </p>
          )}
          {criteria.map((criterion, index) => {
            const priority = CRITERION_PRIORITY_PRESENTATION[criterion.priority];
            const scored = scores[index]?.score != null;
            return (
              <Card
                key={criterion.id}
                className={cn(scored && "ring-success/40")}
              >
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="font-display font-bold text-muted-foreground text-sm tabular-nums">
                      1.{index + 1}
                    </span>
                    <span className="font-semibold text-base">
                      {criterion.name}
                      {criterion.archived ? " (archiviato)" : ""}
                    </span>
                    <Badge className={priority.className}>
                      {priority.label}
                    </Badge>
                    {scored && (
                      <Check
                        className="ml-auto size-4 text-success"
                        aria-label="Valutato"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <BlockLabel>Voto</BlockLabel>
                    <Controller
                      control={control}
                      name={`scores.${index}.score`}
                      render={({ field }) => (
                        <div
                          className="flex flex-wrap gap-1.5"
                          role="group"
                          aria-label={`Voto per ${criterion.name}`}
                        >
                          {SCORES.map((score) => (
                            <Button
                              key={score}
                              type="button"
                              size="sm"
                              className="w-9"
                              variant={
                                field.value === score ? "default" : "outline"
                              }
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
                            variant={
                              field.value === null ? "secondary" : "outline"
                            }
                            aria-pressed={field.value === null}
                            disabled={disabled}
                            onClick={() => field.onChange(null)}
                          >
                            Senza prove
                          </Button>
                        </div>
                      )}
                    />
                  </div>
                  <TextareaField
                    control={control}
                    name={`scores.${index}.evidence`}
                    label="Evidenze"
                    className="min-h-16"
                  />
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="flex flex-col gap-3">
          <ChapterHeader number={2} title="Giudizio complessivo" />
          <Card>
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
              <div className="gap-4 grid md:grid-cols-2">
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
              </div>
            </CardContent>
          </Card>
        </section>
      </fieldset>

      {!submitted && (
        <div className="bottom-4 z-10 sticky flex flex-wrap justify-between items-center gap-3 bg-card shadow-lg px-4 py-3 border rounded-xl">
          <span className="text-muted-foreground text-sm">
            {interviewCompleted
              ? `${scoredCount}/${criteria.length} criteri con voto`
              : "L'invio è disponibile a colloquio concluso"}
          </span>
          <div className="flex flex-wrap items-center gap-2">
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
              Invia feedback
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inviare il feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              Dopo l&apos;invio il feedback non è più modificabile da nessuno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Indietro</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => void handleSubmit(submit)()}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Invia feedback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
