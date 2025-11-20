"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LLMModelSelect } from "@/components/ui/llm-model-select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { generateNewQuizAction, saveQuizAction } from "@/lib/actions/quizzes";
import { quizGenerationConfigSchema } from "@/lib/schemas";
import { LLM_MODELS } from "@/lib/utils";
import { toast } from "sonner";
import { z } from "zod/v4";

type Position = {
  id: string;
  title: string;
  description: string | null;
  experienceLevel: string;
  skills: string[];
  softSkills: string[];
};

type QuizFormProps = {
  position: Position;
};

export const QuizForm = ({ position }: QuizFormProps) => {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  const formSchema = quizGenerationConfigSchema.extend({
    enableTimeLimit: z.boolean(),
    timeLimit: z.number().min(5).max(120),
  });

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quizTitle: `Quiz per ${position.title} (${position.experienceLevel})`,
      instructions: "",
      questionCount: 10,
      includeMultipleChoice: true,
      includeOpenQuestions: true,
      includeCodeSnippets: true,
      difficulty: 3,
      timeLimit: 30,
      enableTimeLimit: true,
      specificModel: LLM_MODELS.KIMI,
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    register,
  } = form;

  const quizTitleId = useId();
  const instructionsId = useId();
  const questionCountId = useId();
  const difficultyId = useId();
  const includeMultipleChoiceId = useId();
  const includeOpenQuestionsId = useId();
  const includeCodeSnippetsId = useId();
  const enableTimeLimitId = useId();
  const timeLimitId = useId();
  const specificModelId = useId();

  const enableTimeLimit = watch("enableTimeLimit");

  async function onSubmit(values: FormData) {
    setGenerating(true);
    try {
      const quizData = await generateNewQuizAction({
        positionId: position.id,
        quizTitle: values.quizTitle,
        questionCount: values.questionCount,
        difficulty: values.difficulty,
        includeMultipleChoice: values.includeMultipleChoice,
        includeOpenQuestions: values.includeOpenQuestions,
        includeCodeSnippets: values.includeCodeSnippets,
        instructions: values.instructions || undefined,
        specificModel: values.specificModel,
      });

      if (!quizData || !quizData.questions) {
        throw new Error("No quiz generated");
      }

      const formData = new FormData();
      formData.append("title", values.quizTitle);
      formData.append("position_id", position.id);
      formData.append("questions", JSON.stringify(quizData.questions));
      formData.append(
        "time_limit",
        values.enableTimeLimit ? values.timeLimit.toString() : ""
      );

      const saveResult = await saveQuizAction(formData);

      if (!saveResult || !saveResult.id) {
        throw new Error("Failed to save quiz");
      }

      toast.success("Quiz generato con successo!");
      router.push(`/dashboard/quizzes/${saveResult.id}`);
    } catch (error: unknown) {
      console.error("Error generating quiz:", error);
      toast.error("Errore", {
        description:
          error instanceof Error
            ? error.message
            : "Si è verificato un errore durante la generazione del quiz",
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Field>
        <FieldLabel htmlFor={quizTitleId}>Titolo del quiz</FieldLabel>
        <FieldContent>
          <Input id={quizTitleId} {...register("quizTitle")} />
        </FieldContent>
        <FieldDescription>Un titolo descrittivo per il quiz</FieldDescription>
        <FieldError
          id={`${quizTitleId}-error`}
          errors={errors.quizTitle ? [errors.quizTitle] : undefined}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={instructionsId}>
          Istruzioni aggiuntive (opzionale)
        </FieldLabel>
        <FieldContent>
          <Textarea
            id={instructionsId}
            className="min-h-20"
            placeholder="Inserisci istruzioni specifiche per la generazione del quiz..."
            {...register("instructions")}
          />
        </FieldContent>
        <FieldDescription>
          Istruzioni specifiche per l&apos;AI che genera il quiz
        </FieldDescription>
        <FieldError
          id={`${instructionsId}-error`}
          errors={errors.instructions ? [errors.instructions] : undefined}
        />
      </Field>

      <div className="gap-4 grid md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={questionCountId}>
            Numero di domande: {watch("questionCount")}
          </FieldLabel>
          <FieldContent>
            <Controller
              control={control}
              name="questionCount"
              render={({ field }) => (
                <Slider
                  id={questionCountId}
                  min={3}
                  max={20}
                  step={1}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                />
              )}
            />
          </FieldContent>
          <FieldDescription>
            Seleziona il numero di domande (3-20)
          </FieldDescription>
          <FieldError
            id={`${questionCountId}-error`}
            errors={errors.questionCount ? [errors.questionCount] : undefined}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={difficultyId}>
            Difficoltà:{" "}
            {
              [
                "Molto facile",
                "Facile",
                "Media",
                "Difficile",
                "Molto difficile",
              ][watch("difficulty") - 1]
            }
          </FieldLabel>
          <FieldContent>
            <Controller
              control={control}
              name="difficulty"
              render={({ field }) => (
                <Slider
                  id={difficultyId}
                  min={1}
                  max={5}
                  step={1}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                />
              )}
            />
          </FieldContent>
          <FieldDescription>
            Seleziona il livello di difficoltà (1-5)
          </FieldDescription>
          <FieldError
            id={`${difficultyId}-error`}
            errors={errors.difficulty ? [errors.difficulty] : undefined}
          />
        </Field>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-lg">Tipi di domande</h3>
        <div className="gap-4 grid md:grid-cols-2">
          <Field
            className="flex flex-row justify-between items-center p-3 border rounded-lg"
            orientation="horizontal"
          >
            <div className="space-y-0.5">
              <FieldLabel
                htmlFor={includeMultipleChoiceId}
                className="text-base"
              >
                Domande a risposta multipla
              </FieldLabel>
              <FieldDescription>
                Domande con opzioni predefinite
              </FieldDescription>
            </div>
            <FieldContent className="flex justify-end items-center">
              <Controller
                control={control}
                name="includeMultipleChoice"
                render={({ field }) => (
                  <Switch
                    id={includeMultipleChoiceId}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </FieldContent>
          </Field>

          <Field
            className="flex flex-row justify-between items-center p-3 border rounded-lg"
            orientation="horizontal"
          >
            <div className="space-y-0.5">
              <FieldLabel
                htmlFor={includeOpenQuestionsId}
                className="text-base"
              >
                Domande aperte
              </FieldLabel>
              <FieldDescription>
                Domande che richiedono risposte testuali
              </FieldDescription>
            </div>
            <FieldContent className="flex justify-end items-center">
              <Controller
                control={control}
                name="includeOpenQuestions"
                render={({ field }) => (
                  <Switch
                    id={includeOpenQuestionsId}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </FieldContent>
          </Field>

          <Field
            className="flex flex-row justify-between items-center p-3 border rounded-lg"
            orientation="horizontal"
          >
            <div className="space-y-0.5">
              <FieldLabel htmlFor={includeCodeSnippetsId} className="text-base">
                Snippet di codice
              </FieldLabel>
              <FieldDescription>
                Sfide di programmazione e analisi di codice
              </FieldDescription>
            </div>
            <FieldContent className="flex justify-end items-center">
              <Controller
                control={control}
                name="includeCodeSnippets"
                render={({ field }) => (
                  <Switch
                    id={includeCodeSnippetsId}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </FieldContent>
          </Field>
        </div>
      </div>

      <Field
        className="flex flex-row items-start gap-3 p-4 border rounded-md"
        orientation="horizontal"
      >
        <FieldContent className="flex-1 space-y-1">
          <FieldLabel htmlFor={enableTimeLimitId} className="text-base">
            Limite di tempo
          </FieldLabel>
          <FieldDescription>
            Imposta un limite di tempo per il completamento del quiz
          </FieldDescription>
        </FieldContent>
        <Controller
          control={control}
          name="enableTimeLimit"
          render={({ field }) => (
            <Switch
              id={enableTimeLimitId}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </Field>

      {enableTimeLimit && (
        <Field>
          <FieldLabel htmlFor={timeLimitId}>
            Limite di tempo: {watch("timeLimit")} minuti
          </FieldLabel>
          <FieldContent>
            <Controller
              control={control}
              name="timeLimit"
              render={({ field }) => (
                <Slider
                  id={timeLimitId}
                  min={5}
                  max={120}
                  step={5}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                />
              )}
            />
          </FieldContent>
          <FieldDescription>
            Seleziona il limite di tempo in minuti
          </FieldDescription>
          <FieldError
            id={`${timeLimitId}-error`}
            errors={errors.timeLimit ? [errors.timeLimit] : undefined}
          />
        </Field>
      )}

      <Field>
        <FieldLabel htmlFor={specificModelId}>Modello LLM</FieldLabel>
        <FieldContent>
          <Controller
            control={control}
            name="specificModel"
            render={({ field }) => (
              <LLMModelSelect
                value={field.value || LLM_MODELS.KIMI}
                onValueChange={field.onChange}
              />
            )}
          />
        </FieldContent>
        <FieldDescription>
          Seleziona il modello LLM per la generazione del quiz.
          <strong>Versatile</strong> è raccomandato per la qualità migliore.
        </FieldDescription>
        <FieldError
          id={`${specificModelId}-error`}
          errors={errors.specificModel ? [errors.specificModel] : undefined}
        />
      </Field>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annulla
        </Button>
        <Button type="submit" disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Generazione in corso...
            </>
          ) : (
            <>
              <BrainCircuit className="mr-2 w-4 h-4" />
              Genera Quiz
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
