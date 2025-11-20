"use client";

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
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LLMModelSelect } from "@/components/ui/llm-model-select";
import { SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { QuestionType } from "@/lib/schemas";
import { LLM_MODELS } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod/v4";
import {
  CheckboxField,
  SelectField,
  SliderField,
  TextareaField,
} from "@/components/rhf-inputs";

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
  requireCodeExample: z.boolean().optional(),
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
}: AIGenerationDialogProps) => {
  const [focusAreaInput, setFocusAreaInput] = useState("");
  const [evaluationCriteriaInput, setEvaluationCriteriaInput] = useState("");

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
      setFocusAreaInput("");
      setEvaluationCriteriaInput("");
    }
  }, [open, questionType, defaultDifficulty, form]);

  const handleSubmit = async (data: GenerationFormData) => {
    if (!questionType) return;
    await onGenerate(questionType, data);
    onOpenChange(false);
  };

  const addFocusArea = () => {
    if (focusAreaInput.trim()) {
      const currentAreas = form.getValues("focusAreas") || [];
      form.setValue("focusAreas", [...currentAreas, focusAreaInput.trim()]);
      setFocusAreaInput("");
    }
  };

  const removeFocusArea = (index: number) => {
    const currentAreas = form.getValues("focusAreas") || [];
    form.setValue(
      "focusAreas",
      currentAreas.filter((_, i) => i !== index)
    );
  };

  const addEvaluationCriteria = () => {
    if (evaluationCriteriaInput.trim()) {
      const currentCriteria = form.getValues("evaluationCriteria") || [];
      form.setValue("evaluationCriteria", [
        ...currentCriteria,
        evaluationCriteriaInput.trim(),
      ]);
      setEvaluationCriteriaInput("");
    }
  };

  const removeEvaluationCriteria = (index: number) => {
    const currentCriteria = form.getValues("evaluationCriteria") || [];
    form.setValue(
      "evaluationCriteria",
      currentCriteria.filter((_, i) => i !== index)
    );
  };

  const getQuestionTypeLabel = (type: QuestionType | null) => {
    switch (type) {
      case "multiple_choice":
        return "Domanda a Scelta Multipla";
      case "open_question":
        return "Domanda Aperta";
      case "code_snippet":
        return "Domanda con Snippet di Codice";
      default:
        return "Domanda";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Impostazioni di Base</h3>

            <Controller
              control={form.control}
              name="llmModel"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Modello AI</FieldLabel>
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
              <div className="space-y-4">
                <Label>Aree di Focus</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="es. React Hooks, TypeScript"
                    value={focusAreaInput}
                    onChange={(e) => setFocusAreaInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFocusArea();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addFocusArea}
                    variant="outline"
                  >
                    Aggiungi
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.watch("focusAreas") || []).map((area, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {area}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-4 hover:text-destructive"
                        onClick={() => removeFocusArea(index)}
                      >
                        <X size={12} />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

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

          {questionType === "open_question" && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm">
                Impostazioni Domanda Aperta
              </h3>
              <Separator className="my-4" />
              <CheckboxField
                control={form.control}
                name="requireCodeExample"
                label="Richiedi Esempio di Codice"
                description="Includi esempi di codice nella domanda"
                orientation="horizontal"
              />

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

              <div className="space-y-4">
                <Label>Criteri di Valutazione</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="es. Qualità del codice, Best practices"
                    value={evaluationCriteriaInput}
                    onChange={(e) => setEvaluationCriteriaInput(e.target.value)}
                    onKeyUp={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addEvaluationCriteria();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addEvaluationCriteria}
                    variant="outline"
                  >
                    Aggiungi
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.watch("evaluationCriteria") || []).map(
                    (criteria, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {criteria}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-4 hover:text-destructive"
                          onClick={() => removeEvaluationCriteria(index)}
                        >
                          <X size={12} />
                        </Button>
                      </Badge>
                    )
                  )}
                </div>
              </div>
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
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="csharp">C#</SelectItem>
                <SelectItem value="php">PHP</SelectItem>
                <SelectItem value="go">Go</SelectItem>
                <SelectItem value="rust">Rust</SelectItem>
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
              {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Genera Domanda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
