"use client";

import { InputWithTagField, TextareaField } from "@/components/ui/rhf-inputs";
import { useFormContext } from "react-hook-form";

type OpenQuestionFormProps = {
  index: number;
};

export const OpenQuestionForm = ({ index }: OpenQuestionFormProps) => {
  const form = useFormContext();

  const questionsErrors = form.formState.errors.questions;
  const questionErrors = Array.isArray(questionsErrors)
    ? questionsErrors[index]
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <TextareaField
        control={form.control}
        name={`questions.${index}.sampleAnswer`}
        label="Risposta di esempio"
        required
        placeholder="Scrivi la domanda qui..."
        className="min-h-[120px]"
      />
      <InputWithTagField
        control={form.control}
        name={`questions.${index}.keywords`}
        label="Parole chiave"
        placeholder="Premi invio dopo ogni parola"
        description="Parole chiave importanti che la risposta dovrebbe contenere."
      />
    </div>
  );
};
