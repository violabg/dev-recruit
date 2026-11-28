"use client";

import {
  InputField,
  SliderField,
  SwitchField,
  TextareaField,
} from "@/components/ui/rhf-inputs";
import type { QuizGenerationFormData } from "@/lib/schemas/quiz";
import { type Control, useWatch } from "react-hook-form";

/** Labels of the difficulty slider, from 1 to 5 */
export const DIFFICULTY_LABELS = [
  "Molto facile",
  "Facile",
  "Media",
  "Difficile",
  "Molto difficile",
] as const;

/**
 * Generation parameters of a quiz: title, instructions, number of
 * questions, difficulty, question types and time limit. Shared by the
 * dashboard generation form and the MCP quiz widget; the model choice stays
 * with the caller.
 */
export function QuizGenerationFields({
  control,
}: {
  control: Control<QuizGenerationFormData>;
}) {
  const [enableTimeLimit, questionCount, difficulty, timeLimit] = useWatch({
    control,
    name: ["enableTimeLimit", "questionCount", "difficulty", "timeLimit"],
  });

  return (
    <>
      <InputField
        control={control}
        name="quizTitle"
        label="Titolo del test"
        description="Un titolo descrittivo per il test"
      />

      <TextareaField
        control={control}
        name="instructions"
        label="Istruzioni aggiuntive (opzionale)"
        placeholder="Inserisci istruzioni specifiche per la generazione del test..."
        className="min-h-20"
        description="Istruzioni specifiche per l'AI che genera il test"
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
          label={`Difficoltà: ${DIFFICULTY_LABELS[difficulty - 1]}`}
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
        description="Imposta un limite di tempo per il completamento del test"
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
    </>
  );
}
