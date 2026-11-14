"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

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
  InputField,
  SliderField,
  SwitchField,
  TextareaField,
} from "@/components/ui/rhf-inputs";
import { generateNewQuizAction } from "@/lib/actions/quizzes";
import {
  quizGenerationFormSchema,
  type FlexibleQuestion,
  type QuizGenerationFormData,
} from "@/lib/schemas";
import { DEFAULT_GENERATION_MODEL } from "@/lib/services/ai/models";
import { unwrap, errorMessage } from "@/lib/utils/action-result";
import { toast } from "sonner";

/** A generated quiz that has NOT been saved: the editor decides what to keep. */
export type GeneratedQuiz = {
  title: string;
  timeLimit: number | null;
  questions: FlexibleQuestion[];
};

type QuizGenerationFormProps = {
  position: {
    id: string;
    title: string;
    experienceLevel: string;
  };
  onCancel: () => void;
  onGenerated: (quiz: GeneratedQuiz) => void;
};

/**
 * Collects the generation parameters and asks the AI for a quiz.
 * It never saves: the result is handed to the quiz editor as unsaved changes.
 */
export function QuizGenerationForm({
  position,
  onCancel,
  onGenerated,
}: QuizGenerationFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<QuizGenerationFormData>({
    resolver: zodResolver(quizGenerationFormSchema),
    defaultValues: {
      quizTitle: `Quiz per ${position.title} (${position.experienceLevel})`,
      instructions: "",
      questionCount: 10,
      includeMultipleChoice: true,
      includeOpenQuestions: true,
      includeCodeSnippets: true,
      includeBehavioralScenarios: false,
      difficulty: 3,
      timeLimit: 30,
      enableTimeLimit: true,
      specificModel: DEFAULT_GENERATION_MODEL,
    },
  });

  const { control, handleSubmit } = form;

  const [enableTimeLimit, questionCount, difficulty, timeLimit] = useWatch({
    control,
    name: ["enableTimeLimit", "questionCount", "difficulty", "timeLimit"],
  });

  function onSubmit(values: QuizGenerationFormData) {
    startTransition(async () => {
      try {
        const quizData = unwrap(
          await generateNewQuizAction({
          positionId: position.id,
          quizTitle: values.quizTitle,
          questionCount: values.questionCount,
          difficulty: values.difficulty,
          includeMultipleChoice: values.includeMultipleChoice,
          includeOpenQuestions: values.includeOpenQuestions,
          includeCodeSnippets: values.includeCodeSnippets,
          includeBehavioralScenarios: values.includeBehavioralScenarios,
          instructions: values.instructions || undefined,
          specificModel: values.specificModel,
          }),
        );

        if (!quizData.questions.length) {
          throw new Error("L'AI non ha generato alcuna domanda");
        }

        onGenerated({
          title: values.quizTitle,
          timeLimit: values.enableTimeLimit ? values.timeLimit : null,
          questions: quizData.questions,
        });
      } catch (error: unknown) {
        toast.error("Errore", {
          description: errorMessage(
            error,
            "Si è verificato un errore durante la generazione del quiz",
          ),
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
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
          label={`Numero di domande: ${questionCount}`}
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
              difficulty - 1
            ]
          }`}
          min={1}
          max={5}
          step={1}
          description="Seleziona il livello di difficoltà (1-5)"
        />
      </div>

      <div className="flex flex-col gap-4">
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

          <SwitchField
            control={control}
            name="includeBehavioralScenarios"
            label="Scenari comportamentali"
            description="Domande situazionali su giudizio e collaborazione"
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
          label={`Limite di tempo: ${timeLimit} minuti`}
          min={5}
          max={120}
          step={5}
          description="Seleziona il limite di tempo in minuti"
        />
      )}

      <Field>
        <FieldLabel className="font-bold">Modello LLM</FieldLabel>
        <FieldContent>
          <Controller
            control={control}
            name="specificModel"
            render={({ field, fieldState }) => (
              <>
                <LLMModelSelect
                  value={field.value || DEFAULT_GENERATION_MODEL}
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
          onClick={onCancel}
          disabled={isPending}
        >
          Annulla
        </Button>
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Generazione in corso...
            </>
          ) : (
            <>
              <BrainCircuit className="mr-1 size-4" />
              Genera Quiz
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
