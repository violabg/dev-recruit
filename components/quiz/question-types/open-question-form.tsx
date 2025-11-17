"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type OpenQuestionFormProps = {
  index: number;
};

export const OpenQuestionForm = ({ index }: OpenQuestionFormProps) => {
  return (
    <div className="flex flex-col gap-4">
      <FormField
        name={`questions.${index}.sampleAnswer`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Risposta di esempio</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Fornisci una risposta di esempio..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name={`questions.${index}.keywords`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Parole chiave (separate da virgola)</FormLabel>
            <FormControl>
              <Input
                placeholder="parola1, parola2, parola3"
                value={field.value?.join(", ") || ""}
                onChange={(e) => {
                  const val = e.target.value
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean);
                  field.onChange(val);
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
