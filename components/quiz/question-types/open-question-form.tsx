"use client";

import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Controller, useFormContext } from "react-hook-form";

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
      <Field>
        <FieldLabel htmlFor={`questions-${index}-sample`}>
          Risposta di esempio
          <span aria-hidden className="ps-1 text-destructive">
            *
          </span>
        </FieldLabel>
        <FieldContent>
          <Controller
            control={form.control}
            name={`questions.${index}.sampleAnswer`}
            render={({ field: sampleField }) => (
              <Textarea
                id={`questions-${index}-sample`}
                placeholder="Fornisci una risposta di esempio..."
                {...sampleField}
              />
            )}
          />
        </FieldContent>
        <FieldError
          errors={
            questionErrors?.sampleAnswer
              ? [questionErrors.sampleAnswer]
              : undefined
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`questions-${index}-keywords`}>
          Parole chiave (separate da virgola)
        </FieldLabel>
        <FieldContent>
          <Controller
            control={form.control}
            name={`questions.${index}.keywords`}
            render={({ field: keywordsField }) => {
              const keywordValue = keywordsField.value?.join(", ") || "";
              return (
                <Input
                  id={`questions-${index}-keywords`}
                  placeholder="parola1, parola2, parola3"
                  value={keywordValue}
                  onChange={(event) => {
                    const parsedValue = event.target.value
                      .split(",")
                      .map((segment) => segment.trim())
                      .filter(Boolean);
                    keywordsField.onChange(parsedValue);
                  }}
                  onBlur={keywordsField.onBlur}
                  ref={keywordsField.ref}
                />
              );
            }}
          />
        </FieldContent>
        <FieldError
          errors={
            questionErrors?.keywords ? [questionErrors.keywords] : undefined
          }
        />
      </Field>
    </div>
  );
};
