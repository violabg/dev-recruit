"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  InputField,
  SliderField,
  SwitchField,
  TextareaField,
} from "@/components/rhf-inputs";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { LLMModelSelect } from "@/components/ui/llm-model-select";
import {
  generateNewQuizAction,
  regenerateQuizAction,
  upsertQuizAction,
} from "@/lib/actions/quizzes";
import { quizGenerationConfigSchema } from "@/lib/schemas";
import { LLM_MODELS } from "@/lib/utils";
import { toast } from "sonner";
import { z } from "zod/v4";

export type Position = {
  id: string;
  title: string;
  description: string | null;
  experienceLevel: string;
  skills: string[];
  softSkills?: string[];
};

export type SaveQuizResult = Awaited<ReturnType<typeof upsertQuizAction>>;

type QuizFormProps = {
  position: Position;
  onCancel?: () => void;
  onSuccess?: (result: SaveQuizResult) => void;
  quizId?: string;
};

export const QuizForm = ({
  position,
  onCancel,
  onSuccess,
  quizId,
}: QuizFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  const { control, handleSubmit, watch } = form;

  const enableTimeLimit = watch("enableTimeLimit");

  async function onSubmit(values: FormData) {
    startTransition(async () => {
      try {
        // If editing existing quiz, use regenerateQuizAction
        if (quizId) {
          const result = await regenerateQuizAction({
            quizId,
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

          toast.success("Quiz rigenerato con successo!");
          if (onSuccess) {
            onSuccess(result);
          }
        } else {
          // Creating new quiz
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

          const saveResult = await upsertQuizAction(formData);

          if (!saveResult || !saveResult.id) {
            throw new Error("Failed to save quiz");
          }

          toast.success("Quiz generato con successo!");
          if (onSuccess) {
            onSuccess(saveResult);
          } else {
            router.push(`/dashboard/quizzes/${saveResult.id}`);
          }
        }
      } catch (error: unknown) {
        console.error("Error generating quiz:", error);
        toast.error("Errore", {
          description:
            error instanceof Error
              ? error.message
              : "Si è verificato un errore durante la generazione del quiz",
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <InputField
        control={control}
        name="quizTitle"
        label="Titolo del quiz"
        description="Un titolo descrittivo per il quiz"
      />

      <TextareaField
        control={control}
        name="instructions"
        label="Istruzioni aggiuntive (opzionale)"
        placeholder="Inserisci istruzioni specifiche per la generazione del quiz..."
        className="min-h-20"
        description="Istruzioni specifiche per l'AI che genera il quiz"
      />

      <div className="gap-4 grid md:grid-cols-2">
        <SliderField
          control={control}
          name="questionCount"
          label={`Numero di domande: ${watch("questionCount")}`}
          min={3}
          max={20}
          step={1}
          description="Seleziona il numero di domande (3-20)"
        />

        <SliderField
          control={control}
          name="difficulty"
          label={`Difficoltà: ${
            ["Molto facile", "Facile", "Media", "Difficile", "Molto difficile"][
              watch("difficulty") - 1
            ]
          }`}
          min={1}
          max={5}
          step={1}
          description="Seleziona il livello di difficoltà (1-5)"
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-lg">Tipi di domande</h3>
        <div className="gap-4 grid md:grid-cols-2">
          <SwitchField
            control={control}
            name="includeMultipleChoice"
            label="Domande a risposta multipla"
            description="Domande con opzioni predefinite"
          />

          <SwitchField
            control={control}
            name="includeOpenQuestions"
            label="Domande aperte"
            description="Domande che richiedono risposte testuali"
          />

          <SwitchField
            control={control}
            name="includeCodeSnippets"
            label="Snippet di codice"
            description="Sfide di programmazione e analisi di codice"
          />
        </div>
      </div>

      <SwitchField
        control={control}
        name="enableTimeLimit"
        label="Limite di tempo"
        description="Imposta un limite di tempo per il completamento del quiz"
      />

      {enableTimeLimit && (
        <SliderField
          control={control}
          name="timeLimit"
          label={`Limite di tempo: ${watch("timeLimit")} minuti`}
          min={5}
          max={120}
          step={5}
          description="Seleziona il limite di tempo in minuti"
        />
      )}

      <Field>
        <FieldLabel>Modello LLM</FieldLabel>
        <FieldContent>
          <Controller
            control={control}
            name="specificModel"
            render={({ field, fieldState }) => (
              <>
                <LLMModelSelect
                  value={field.value || LLM_MODELS.KIMI}
                  onValueChange={field.onChange}
                />
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </>
            )}
          />
        </FieldContent>
        <FieldDescription>
          Seleziona il modello LLM per la generazione del quiz.
          <strong> Versatile</strong> è raccomandato per la qualità migliore.
        </FieldDescription>
      </Field>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              router.back();
            }
          }}
        >
          Annulla
        </Button>
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Generazione in corso...
            </>
          ) : (
            <>
              <BrainCircuit className="mr-1 w-4 h-4" />
              Genera Quiz
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
