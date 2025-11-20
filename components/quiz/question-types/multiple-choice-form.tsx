"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { InputField, TextareaField } from "@/components/rhf-inputs";

type MultipleChoiceFormProps = {
  index: number;
};

export const MultipleChoiceForm = ({ index }: MultipleChoiceFormProps) => {
  const form = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `questions.${index}.options`,
  });

  const questionsErrors = form.formState.errors.questions;
  const questionErrors = Array.isArray(questionsErrors)
    ? questionsErrors[index]
    : undefined;

  // Ensure minimum 4 options on mount
  useEffect(() => {
    if (fields.length < 4) {
      const missingOptions = 4 - fields.length;
      for (let i = 0; i < missingOptions; i++) {
        append("");
      }
    }
  }, [fields.length, append]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label className="font-medium">Opzioni</label>
          <span className="text-muted-foreground text-sm">
            Minimo 4 opzioni, ognuna con almeno 3 caratteri
          </span>
        </div>
        <div className="flex flex-col items-start gap-4">
          {fields.map((field, optIdx) => {
            const optionError = questionErrors?.options?.[optIdx]?.message;
            const optionId = `questions-${index}-option-${optIdx}`;

            return (
              <div key={field.id} className="flex items-start gap-2 w-full">
                <Field className="flex-1">
                  <FieldLabel htmlFor={optionId} className="sr-only">
                    Opzione {optIdx + 1}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      placeholder={`Opzione ${optIdx + 1}`}
                      {...field}
                      minLength={3}
                    />
                  </FieldContent>
                  <FieldError
                    errors={
                      optionError ? [{ message: optionError }] : undefined
                    }
                  />
                </Field>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(optIdx)}
                  disabled={fields.length <= 4}
                >
                  &times;
                </Button>
              </div>
            );
          })}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => append("")}
          >
            + Aggiungi opzione{" "}
            {fields.length < 4 && `(${4 - fields.length} ancora richieste)`}
          </Button>
        </div>
      </div>
      <InputField
        control={form.control}
        name={`questions.${index}.correctAnswer`}
        label="Risposta corretta (indice)"
        type="number"
        placeholder="0, 1, 2..."
        min={0}
        max={Math.max(0, fields.length - 1)}
        description={`Inserisci l'indice dell'opzione corretta (0 = prima opzione, 1 = seconda, ecc.)${
          fields.length > 0 ? ` - Range valido: 0-${fields.length - 1}` : ""
        }`}
      />
      <TextareaField
        control={form.control}
        name={`questions.${index}.explanation`}
        label="Spiegazione"
        placeholder="Spiega perché questa è la risposta corretta..."
      />
    </div>
  );
};
