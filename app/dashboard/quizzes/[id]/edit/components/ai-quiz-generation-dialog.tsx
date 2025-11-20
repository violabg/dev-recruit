"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LLMModelSelect } from "@/components/ui/llm-model-select";
import { AIGenerationFormData, aiGenerationSchema } from "@/lib/schemas";
import { LLM_MODELS } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { SliderField, TextareaField } from "@/components/rhf-inputs";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

type AIGenerationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onGenerate: (data: AIGenerationFormData) => Promise<void>;
  loading?: boolean;
  showDifficulty?: boolean;
  defaultDifficulty?: number;
};

const getDifficultyLabel = (value: number) => {
  const labels = {
    1: "Molto Facile",
    2: "Facile",
    3: "Medio",
    4: "Difficile",
    5: "Molto Difficile",
  };
  return labels[value as keyof typeof labels] || "Medio";
};

export const AIQuizGenerationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onGenerate,
  loading = false,
  showDifficulty = false,
  defaultDifficulty = 3,
}: AIGenerationDialogProps) => {
  const form = useForm<AIGenerationFormData>({
    resolver: zodResolver(aiGenerationSchema),
    defaultValues: {
      instructions: "",
      llmModel: LLM_MODELS.KIMI,
      difficulty: showDifficulty ? defaultDifficulty : undefined,
    },
  });

  const handleSubmit = async (data: AIGenerationFormData) => {
    try {
      await onGenerate(data);
      onOpenChange(false);
      form.reset({
        instructions: "",
        llmModel: LLM_MODELS.KIMI,
        difficulty: showDifficulty ? defaultDifficulty : undefined,
      });
    } catch (error) {
      console.error("Generation error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {showDifficulty && (
            <SliderField
              control={form.control}
              name="difficulty"
              label={`Livello di Difficoltà: ${
                form.watch("difficulty")
                  ? getDifficultyLabel(form.watch("difficulty")!)
                  : "Medio"
              }`}
              min={1}
              max={5}
              step={1}
              description="Seleziona il livello di difficoltà per la generazione"
            />
          )}
          <TextareaField
            control={form.control}
            name="instructions"
            label="Istruzioni aggiuntive (opzionale)"
            placeholder="Inserisci istruzioni specifiche per l'AI..."
            className="min-h-20"
            description="Fornisci istruzioni specifiche per guidare la generazione dell'AI"
          />
          <Controller
            control={form.control}
            name="llmModel"
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Modello LLM</FieldLabel>
                <FieldContent>
                  <LLMModelSelect
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </FieldContent>
                <FieldDescription>
                  Seleziona il modello LLM per la generazione.
                  <strong> Versatile</strong> è raccomandato per la qualità
                  migliore.
                </FieldDescription>
                <FieldError
                  errors={fieldState.error ? [fieldState.error] : undefined}
                />
              </Field>
            )}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Generazione...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 w-4 h-4" />
                  Genera
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
