"use client";

import { programmingLanguages } from "@/components/positions/data";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

  // Type guard to safely access code snippet properties
  const getLanguage = () => {
    if (field.type === "code_snippet") {
      return field.language.toLowerCase() || "javascript";
    }
    return "javascript";
  };

  return (
    <div className="space-y-4">
      <FormField
        name={`questions.${index}.language`}
        render={({ field: formField }) => {
          return (
            <FormItem>
              <FormLabel>Linguaggio di programmazione</FormLabel>
              <FormControl>
                <Select
                  value={formField.value?.toLowerCase() || getLanguage()}
                  onValueChange={(value) => {
                    formField.onChange(value);
                  }}
                >
                  <SelectTrigger className="w-48">
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
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
      <FormField
        name={`questions.${index}.codeSnippet`}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>Snippet di codice</FormLabel>
            <FormControl>
              <CodeEditor
                value={formField.value || ""}
                language={getLanguageCode(getLanguage())}
                placeholder="Inserisci il codice qui..."
                onChange={(evn) => formField.onChange(evn.target.value)}
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
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name={`questions.${index}.sampleSolution`}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>Soluzione di esempio</FormLabel>
            <FormControl>
              <CodeEditor
                value={formField.value || ""}
                language={getLanguageCode(getLanguage())}
                placeholder="Inserisci la soluzione qui..."
                onChange={(evn) => formField.onChange(evn.target.value)}
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
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
