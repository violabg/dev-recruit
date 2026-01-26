"use client";
import {
  CheckboxField,
  InputWithTagField,
  SelectField,
  SliderField,
  TextareaField,
} from "@/components/rhf-inputs";
import { Badge } from "@/components/ui/badge";
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
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { LLMModelSelect } from "@/components/ui/llm-model-select";
import { SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { QuestionType } from "@/lib/schemas";
import { LLM_MODELS } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

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

// generation form schema
const generationSchema = z.object({
  instructions: z.string().optional(),
  llmModel: z.string().min(1, "Please select a model"),
  difficulty: z.number().min(1).max(5).optional(),

  // Multiple Choice specific
  focusAreas: z.array(z.string()).optional(),
  distractorComplexity: z.enum(["simple", "moderate", "complex"]).optional(),

  // Open Question specific
  expectedResponseLength: z.enum(["short", "medium", "long"]).optional(),
  evaluationCriteria: z.array(z.string()).optional(),

  // Code Snippet specific
  language: z.string().optional(),
  bugType: z.enum(["syntax", "logic", "performance", "security"]).optional(),
  codeComplexity: z.enum(["basic", "intermediate", "advanced"]).optional(),
  includeComments: z.boolean().optional(),
});

type GenerationFormData = z.infer<typeof generationSchema>;

type AIGenerationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  questionType: QuestionType | null;
  onGenerate: (type: QuestionType, data: GenerationFormData) => Promise<void>;
  loading: boolean;
  defaultDifficulty?: number;
  languageOptions?: React.ReactNode;
};

export const AIQuestionGenerationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  questionType,
  onGenerate,
  loading,
  defaultDifficulty = 3,
  languageOptions,
}: AIGenerationDialogProps) => {
  const form = useForm<GenerationFormData>({
    resolver: zodResolver(generationSchema),
    defaultValues: {
      llmModel: LLM_MODELS.KIMI,
      difficulty: defaultDifficulty,
      distractorComplexity: "moderate",
      expectedResponseLength: "medium",
      codeComplexity: "intermediate",
      includeComments: true,
      focusAreas: [],
      evaluationCriteria: [],
    },
  });

  useEffect(() => {
    if (open && questionType) {
      form.reset({
        llmModel: LLM_MODELS.KIMI,
        difficulty: defaultDifficulty,
        distractorComplexity: "moderate",
        expectedResponseLength: "medium",
        codeComplexity: "intermediate",
        includeComments: true,
        focusAreas: [],
        evaluationCriteria: [],
      });
    }
  }, [open, questionType, defaultDifficulty, form]);

  const handleSubmit = async (data: GenerationFormData) => {
    if (!questionType) return;
    await onGenerate(questionType, data);
    onOpenChange(false);
  };

  const getQuestionTypeLabel = (type: QuestionType | null) => {
    switch (type) {
      case "multiple_choice":
        return "Domanda a Scelta Multipla";
      case "open_question":
        return "Domanda Aperta";
      case "code_snippet":
        return "Domanda con Snippet di Codice";
      case "behavioral_scenario":
        return "Scenario Comportamentale";
      default:
        return "Domanda";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="space-y-1">
            <span>{description}</span>
            {questionType && (
              <Badge variant="secondary" className="ml-2">
                {getQuestionTypeLabel(questionType)}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
          noValidate
        >
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Impostazioni di Base</h3>

            <Controller
              control={form.control}
              name="llmModel"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel className="font-bold">
                    Modello AI
                    <span aria-hidden className="ps-1 text-destructive">
                      *
                    </span>
                  </FieldLabel>
                  <FieldContent>
                    <LLMModelSelect
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FieldContent>
                  <FieldError
                    errors={fieldState.error ? [fieldState.error] : undefined}
                  />
                </Field>
              )}
            />

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

            <TextareaField
              control={form.control}
              name="instructions"
              label="Istruzioni Aggiuntive"
              placeholder="Eventuali requisiti specifici o contesto per la domanda..."
            />
          </div>

          {questionType === "multiple_choice" && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm">
                Impostazioni Scelta Multipla
              </h3>
              <Separator className="my-4" />
              <InputWithTagField
                control={form.control}
                name="focusAreas"
                label="Aree di Focus"
                description="Aggiungi aree specifiche su cui focalizzare la domanda es. React Hooks, TypeScript"
                placeholder="Premi invio dopo ogni area"
              />
              <SelectField
                control={form.control}
                name="distractorComplexity"
                label="Complessità dei Distrattori"
                description="Quanto dovrebbero essere difficili da distinguere le opzioni sbagliate"
              >
                <SelectItem value="simple">Semplice</SelectItem>
                <SelectItem value="moderate">Moderata</SelectItem>
                <SelectItem value="complex">Complessa</SelectItem>
              </SelectField>
            </div>
          )}

          {(questionType === "open_question" ||
            questionType === "behavioral_scenario") && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm">
                Impostazioni Domanda Aperta / Scenario
              </h3>
              <Separator className="my-4" />

              <SelectField
                control={form.control}
                name="expectedResponseLength"
                label="Lunghezza Risposta Attesa"
              >
                <SelectItem value="short">Breve (1-2 frasi)</SelectItem>
                <SelectItem value="medium">Media (1-2 paragrafi)</SelectItem>
                <SelectItem value="long">
                  Lunga (spiegazione dettagliata)
                </SelectItem>
              </SelectField>

              <InputWithTagField
                control={form.control}
                name="evaluationCriteria"
                label="Criteri di Valutazione"
                description="es. Qualità del codice, Best practices"
                placeholder="Premi invio dopo ogni criterio"
              />
            </div>
          )}

          {questionType === "code_snippet" && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm">
                Impostazioni Snippet di Codice
              </h3>
              <Separator className="my-4" />
              <SelectField
                control={form.control}
                name="language"
                label="Linguaggio di Programmazione"
                placeholder="Seleziona linguaggio"
              >
                {languageOptions}
              </SelectField>

              <SelectField
                control={form.control}
                name="bugType"
                label="Tipo di Bug/Problema"
                placeholder="Seleziona tipo di bug"
              >
                <SelectItem value="syntax">Errore di Sintassi</SelectItem>
                <SelectItem value="logic">Errore di Logica</SelectItem>
                <SelectItem value="performance">
                  Problema di Performance
                </SelectItem>
                <SelectItem value="security">
                  Vulnerabilità di Sicurezza
                </SelectItem>
              </SelectField>

              <SelectField
                control={form.control}
                name="codeComplexity"
                label="Complessità del Codice"
              >
                <SelectItem value="basic">Base</SelectItem>
                <SelectItem value="intermediate">Intermedio</SelectItem>
                <SelectItem value="advanced">Avanzato</SelectItem>
              </SelectField>

              <CheckboxField
                control={form.control}
                name="includeComments"
                label="Includi Commenti"
                description="Aggiungi commenti utili al codice"
                orientation="horizontal"
              />
            </div>
          )}

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
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Genera Domanda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
