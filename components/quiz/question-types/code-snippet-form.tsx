"use client";

import { programmingLanguages } from "@/components/positions/data";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Question } from "@/lib/schemas";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { Controller, useFormContext } from "react-hook-form";
import { getLanguageCode } from ".";

const CodeEditor = dynamic(
  () => import("@uiw/react-textarea-code-editor").then((mod) => mod.default),
  { ssr: false }
);

type CodeSnippetFormProps = {
  index: number;
  field: Question;
};

export const CodeSnippetForm = ({ index, field }: CodeSnippetFormProps) => {
  const { resolvedTheme } = useTheme();
  const form = useFormContext();

  const questionsErrors = form.formState.errors.questions;
  const questionErrors = Array.isArray(questionsErrors)
    ? questionsErrors[index]
    : undefined;

  // Type guard to safely access code snippet properties
  const getLanguage = () => {
    if (field.type === "code_snippet") {
      return field.language.toLowerCase() || "javascript";
    }
    return "javascript";
  };

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor={`questions-${index}-language`}>
          Linguaggio di programmazione
          <span aria-hidden className="ps-1 text-destructive">
            *
          </span>
        </FieldLabel>
        <FieldContent>
          <Controller
            control={form.control}
            name={`questions.${index}.language`}
            render={({ field: languageField }) => (
              <Select
                value={languageField.value?.toLowerCase() || getLanguage()}
                onValueChange={(value) => {
                  languageField.onChange(value);
                }}
              >
                <SelectTrigger
                  className="w-48"
                  id={`questions-${index}-language`}
                >
                  <SelectValue placeholder="Seleziona linguaggio" />
                </SelectTrigger>
                <SelectContent>
                  {programmingLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang.toLowerCase()}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FieldContent>
        <FieldError
          errors={
            questionErrors?.language ? [questionErrors.language] : undefined
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`questions-${index}-code`}>
          Snippet di codice
          <span aria-hidden className="ps-1 text-destructive">
            *
          </span>
        </FieldLabel>
        <FieldContent>
          <Controller
            control={form.control}
            name={`questions.${index}.codeSnippet`}
            render={({ field: codeField }) => (
              <CodeEditor
                id={`questions-${index}-code`}
                value={codeField.value || ""}
                language={getLanguageCode(getLanguage())}
                placeholder="Inserisci il codice qui..."
                onChange={(evn) => codeField.onChange(evn.target.value)}
                padding={15}
                data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
                style={{
                  fontSize: 14,
                  backgroundColor:
                    resolvedTheme === "dark" ? "#1a1a1a" : "#f8f9fa",
                  fontFamily:
                    "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: resolvedTheme === "dark" ? "#374151" : "#d1d5db",
                }}
              />
            )}
          />
        </FieldContent>
        <FieldError
          errors={
            questionErrors?.codeSnippet
              ? [questionErrors.codeSnippet]
              : undefined
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`questions-${index}-solution`}>
          Soluzione di esempio
          <span aria-hidden className="ps-1 text-destructive">
            *
          </span>
        </FieldLabel>
        <FieldContent>
          <Controller
            control={form.control}
            name={`questions.${index}.sampleSolution`}
            render={({ field: solutionField }) => (
              <CodeEditor
                id={`questions-${index}-solution`}
                value={solutionField.value || ""}
                language={getLanguageCode(getLanguage())}
                placeholder="Inserisci la soluzione qui..."
                onChange={(evn) => solutionField.onChange(evn.target.value)}
                padding={15}
                data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
                style={{
                  fontSize: 14,
                  backgroundColor:
                    resolvedTheme === "dark" ? "#1a1a1a" : "#f8f9fa",
                  fontFamily:
                    "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: resolvedTheme === "dark" ? "#374151" : "#d1d5db",
                }}
              />
            )}
          />
        </FieldContent>
        <FieldError
          errors={
            questionErrors?.sampleSolution
              ? [questionErrors.sampleSolution]
              : undefined
          }
        />
      </Field>
    </div>
  );
};
