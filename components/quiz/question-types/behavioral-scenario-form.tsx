"use client";

import { InputWithTagField, TextareaField } from "@/components/ui/rhf-inputs";
import { useFormContext } from "react-hook-form";

type BehavioralScenarioFormProps = {
  index: number;
};

export const BehavioralScenarioForm = ({
  index,
}: BehavioralScenarioFormProps) => {
  const form = useFormContext();

  return (
    <div className="flex flex-col gap-4">
      <TextareaField
        control={form.control}
        name={`questions.${index}.sampleAnswer`}
        label="Risposta di esempio"
        required
        placeholder="Descrivi una risposta efficace e ragionata..."
        className="min-h-[120px]"
      />
      <InputWithTagField
        control={form.control}
        name={`questions.${index}.keywords`}
        label="Temi di valutazione"
        placeholder="Premi invio dopo ogni tema"
        description="Temi chiave da cercare nella risposta (es. comunicazione, trade-off, collaborazione)."
        showClear
      />
    </div>
  );
};
