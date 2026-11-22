"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { LLMModelSelect } from "@/components/ui/llm-model-select";
import { QuizGenerationFields } from "./quiz-generation-fields";
import { generateNewQuizAction } from "@/lib/actions/quizzes";
import {
  quizGenerationDefaults,
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
      ...quizGenerationDefaults(position),
      specificModel: DEFAULT_GENERATION_MODEL,
    },
  });

  const { control, handleSubmit } = form;

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
      <QuizGenerationFields control={control} />

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
