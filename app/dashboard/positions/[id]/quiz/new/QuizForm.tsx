"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LLMModelSelect } from "@/components/ui/llm-model-select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { generateNewQuizAction, saveQuizAction } from "@/lib/actions/quizzes";
import { quizGenerationConfigSchema } from "@/lib/schemas";
import { LLM_MODELS } from "@/lib/utils";
import { toast } from "sonner";
import { z } from "zod/v4";

type Position = {
  id: string;
  title: string;
  description: string | null;
  experienceLevel: string;
  skills: string[];
  softSkills: string[];
};

type QuizFormProps = {
  position: Position;
};

export const QuizForm = ({ position }: QuizFormProps) => {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  // Create form schema with additional frontend fields
  const formSchema = quizGenerationConfigSchema.extend({
    enableTimeLimit: z.boolean(),
    timeLimit: z.number().min(5).max(120),
  });

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quizTitle: `Quiz per ${position.title} (${position.experienceLevel})`,
      instructions: "",
      questionCount: 10,
      includeMultipleChoice: true,
      includeOpenQuestions: true,
      includeCodeSnippets: true,
      difficulty: 3,
      timeLimit: 30,
      enableTimeLimit: true,
      specificModel: LLM_MODELS.KIMI,
    },
  });

  async function onSubmit(values: FormData) {
    setGenerating(true);
    try {
      // Generate quiz using server action
      const quizData = await generateNewQuizAction({
        positionId: position.id,
        quizTitle: values.quizTitle,
        questionCount: values.questionCount,
        difficulty: values.difficulty,
        includeMultipleChoice: values.includeMultipleChoice,
        includeOpenQuestions: values.includeOpenQuestions,
        includeCodeSnippets: values.includeCodeSnippets,
        instructions: values.instructions || undefined,
        specificModel: values.specificModel,
      });

      if (!quizData || !quizData.questions) {
        throw new Error("No quiz generated");
      }

      // Save quiz to database using server action
      const formData = new FormData();
      formData.append("title", values.quizTitle);
      formData.append("position_id", position.id);
      formData.append("questions", JSON.stringify(quizData.questions));
      formData.append(
        "time_limit",
        values.enableTimeLimit ? values.timeLimit.toString() : ""
      );

      const saveResult = await saveQuizAction(formData);

      if (!saveResult || !saveResult.id) {
        throw new Error("Failed to save quiz");
      }

      toast.success("Quiz generato con successo!");
      router.push(`/dashboard/quizzes/${saveResult.id}`);
    } catch (error: unknown) {
      console.error("Error generating quiz:", error);
      toast.error("Errore", {
        description:
          error instanceof Error
            ? error.message
            : "Si è verificato un errore durante la generazione del quiz",
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="quizTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titolo del quiz</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                Un titolo descrittivo per il quiz
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Istruzioni aggiuntive (opzionale)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Inserisci istruzioni specifiche per la generazione del quiz..."
                  className="min-h-20"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Istruzioni specifiche per l&apos;AI che genera il quiz
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="gap-4 grid md:grid-cols-2">
          <FormField
            control={form.control}
            name="questionCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero di domande: {field.value}</FormLabel>
                <FormControl>
                  <Slider
                    min={3}
                    max={20}
                    step={1}
                    defaultValue={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                  />
                </FormControl>
                <FormDescription>
                  Seleziona il numero di domande (3-20)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Difficoltà:{" "}
                  {
                    [
                      "Molto facile",
                      "Facile",
                      "Media",
                      "Difficile",
                      "Molto difficile",
                    ][field.value - 1]
                  }
                </FormLabel>
                <FormControl>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    defaultValue={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                  />
                </FormControl>
                <FormDescription>
                  Seleziona il livello di difficoltà (1-5)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-lg">Tipi di domande</h3>
          <div className="gap-4 grid md:grid-cols-2">
            <FormField
              control={form.control}
              name="includeMultipleChoice"
              render={({ field }) => (
                <FormItem className="flex flex-row justify-between items-center p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <FormLabel>Domande a risposta multipla</FormLabel>
                    <FormDescription>
                      Domande con opzioni predefinite
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="includeOpenQuestions"
              render={({ field }) => (
                <FormItem className="flex flex-row justify-between items-center p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <FormLabel>Domande aperte</FormLabel>
                    <FormDescription>
                      Domande che richiedono risposte testuali
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="includeCodeSnippets"
              render={({ field }) => (
                <FormItem className="flex flex-row justify-between items-center p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <FormLabel>Snippet di codice</FormLabel>
                    <FormDescription>
                      Sfide di programmazione e analisi di codice
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="enableTimeLimit"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Limite di tempo</FormLabel>
                <FormDescription>
                  Imposta un limite di tempo per il completamento del quiz
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {form.watch("enableTimeLimit") && (
          <FormField
            control={form.control}
            name="timeLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limite di tempo: {field.value} minuti</FormLabel>
                <FormControl>
                  <Slider
                    min={5}
                    max={120}
                    step={5}
                    defaultValue={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                  />
                </FormControl>
                <FormDescription>
                  Seleziona il limite di tempo in minuti
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="specificModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modello LLM</FormLabel>
              <FormControl>
                <LLMModelSelect
                  value={field.value || LLM_MODELS.KIMI}
                  onValueChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Seleziona il modello LLM per la generazione del quiz.
                <strong>Versatile</strong> è raccomandato per la qualità
                migliore.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annulla
          </Button>
          <Button type="submit" disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Generazione in corso...
              </>
            ) : (
              <>
                <BrainCircuit className="mr-2 w-4 h-4" />
                Genera Quiz
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
