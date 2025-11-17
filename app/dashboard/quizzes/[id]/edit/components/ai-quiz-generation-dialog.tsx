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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LLMModelSelect } from "@/components/ui/llm-model-select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { AIGenerationFormData, aiGenerationSchema } from "@/lib/schemas";
import { LLM_MODELS } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";

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
      llmModel: LLM_MODELS.VERSATILE,
      difficulty: showDifficulty ? defaultDifficulty : undefined,
    },
  });

  const handleSubmit = async (data: AIGenerationFormData) => {
    try {
      await onGenerate(data);
      onOpenChange(false);
      form.reset({
        instructions: "",
        llmModel: LLM_MODELS.VERSATILE,
        difficulty: showDifficulty ? defaultDifficulty : undefined,
      });
    } catch (error) {
      // Error handling is done by the parent component
      console.error("Generation error:", error);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {showDifficulty && (
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Livello di Difficoltà:{" "}
                      {field.value ? getDifficultyLabel(field.value) : "Medio"}
                    </FormLabel>
                    <FormControl>
                      <div className="px-3">
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[field.value || defaultDifficulty]}
                          onValueChange={(values) => field.onChange(values[0])}
                          className="w-full"
                        />
                        <div className="flex justify-between mt-2 text-muted-foreground text-xs">
                          <span>Molto Facile</span>
                          <span>Facile</span>
                          <span>Medio</span>
                          <span>Difficile</span>
                          <span>Molto Difficile</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Seleziona il livello di difficoltà per la generazione
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Istruzioni aggiuntive (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Inserisci istruzioni specifiche per l'AI..."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Fornisci istruzioni specifiche per guidare la generazione
                    dell&apos;AI
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="llmModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modello LLM</FormLabel>
                  <FormControl>
                    <LLMModelSelect
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Seleziona il modello LLM per la generazione.
                    <strong> Versatile</strong> è raccomandato per la qualità
                    migliore.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
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
        </Form>
      </DialogContent>
    </Dialog>
  );
};
