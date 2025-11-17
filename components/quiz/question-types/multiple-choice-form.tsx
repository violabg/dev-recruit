"use client";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

type MultipleChoiceFormProps = {
  index: number;
};

export const MultipleChoiceForm = ({ index }: MultipleChoiceFormProps) => {
  const form = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `questions.${index}.options`,
  });

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
          {fields.map((field, optIdx) => (
            <div key={field.id} className="flex items-start gap-2 w-full">
              <FormField
                name={`questions.${index}.options.${optIdx}`}
                render={({ field }) => {
                  const errorMessage = (
                    form.formState.errors?.questions as any[] | undefined
                  )?.[index]?.options?.[optIdx]?.message;
                  return (
                    <FormItem className="flex-1">
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder={`Opzione ${optIdx + 1}`}
                            {...field}
                            minLength={3}
                            className={errorMessage ? "border-red-500" : ""}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => remove(optIdx)}
                disabled={fields.length <= 4} // Prevent removing below minimum of 4 options
              >
                &times;
              </Button>
            </div>
          ))}
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
      <FormField
        name={`questions.${index}.correctAnswer`}
        render={({ field }) => {
          return (
            <FormItem>
              <FormLabel>Risposta corretta (indice)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0, 1, 2..."
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  value={field.value}
                  min={0}
                  max={Math.max(0, fields.length - 1)}
                />
              </FormControl>
              <div className="text-muted-foreground text-sm">
                Inserisci l&apos;indice dell&apos;opzione corretta (0 = prima
                opzione, 1 = seconda, ecc.)
                {fields.length > 0 && ` - Range valido: 0-${fields.length - 1}`}
              </div>
              <FormMessage />
            </FormItem>
          );
        }}
      />
      <FormField
        name={`questions.${index}.explanation`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Spiegazione</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Spiega perché questa è la risposta corretta..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
