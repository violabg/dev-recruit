"use client";
import { Button } from "@/components/ui/button";
import {
  InputField,
  InputWithTagField,
  MultiSelectField,
  SelectField,
  SliderField,
  SwitchField,
  TextareaField,
} from "@/components/ui/rhf-inputs";
import { createPresetAction, updatePresetAction } from "@/lib/actions/presets";
import { type Preset } from "@/lib/data/presets";
import { createPresetSchema, type CreatePresetInput } from "@/lib/schemas";
import { PRESET_ICON_OPTIONS } from "@/lib/utils/preset-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { type z } from "zod";

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Scelta multipla" },
  { value: "code_snippet", label: "Snippet di codice" },
  { value: "open_question", label: "Domanda aperta" },
  { value: "behavioral_scenario", label: "Scenario comportamentale" },
];

const COMMON_TAGS = [
  "React",
  "TypeScript",
  "JavaScript",
  "API",
  "Database",
  "Security",
  "Performance",
  "Frontend",
  "Backend",
  "FullStack",
  "Hooks",
  "Advanced",
  "Intermediate",
  "Beginner",
  "Algorithms",
  "Design Patterns",
  "Best Practices",
];

const DISTRACTOR_COMPLEXITY_OPTIONS = [
  { value: "simple", label: "Semplice" },
  { value: "moderate", label: "Moderato" },
  { value: "complex", label: "Complesso" },
];

const EXPECTED_RESPONSE_LENGTH_OPTIONS = [
  { value: "short", label: "Breve" },
  { value: "medium", label: "Media" },
  { value: "long", label: "Lunga" },
];

const BUG_TYPE_OPTIONS = [
  { value: "syntax", label: "Sintassi" },
  { value: "logic", label: "Logica" },
  { value: "performance", label: "Performance" },
  { value: "security", label: "Sicurezza" },
];

const CODE_COMPLEXITY_OPTIONS = [
  { value: "basic", label: "Base" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzato" },
];

type PresetFormProps = {
  preset?: Preset;
};

type PresetFormValues = z.input<typeof createPresetSchema>;

export function PresetForm({ preset }: PresetFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const defaultValues: PresetFormValues = {
    name: preset?.name ?? "",
    label: preset?.label ?? "",
    description: preset?.description ?? "",
    icon: preset?.icon ?? "Code",
    questionType:
      (preset?.questionType as CreatePresetInput["questionType"]) ??
      "multiple_choice",
    tags: preset?.tags ?? [],
    difficulty: preset?.difficulty ?? 3,
    instructions: preset?.instructions ?? "",
    focusAreas: preset?.focusAreas ?? [],
    evaluationCriteria: preset?.evaluationCriteria ?? [],
    language: preset?.language ?? "",
    includeComments: preset?.includeComments ?? true,
    distractorComplexity:
      preset?.distractorComplexity ?? DISTRACTOR_COMPLEXITY_OPTIONS[1].value,
    expectedResponseLength: preset?.expectedResponseLength ?? "",
    bugType: preset?.bugType ?? "",
    codeComplexity: preset?.codeComplexity ?? "",
  };

  const form = useForm<PresetFormValues>({
    resolver: zodResolver(createPresetSchema),
    defaultValues,
  });

  const questionType = form.watch("questionType");

  const onSubmit = (data: PresetFormValues) => {
    startTransition(async () => {
      try {
        const normalizedData: CreatePresetInput = {
          ...data,
          description: data.description?.trim() || undefined,
          instructions: data.instructions?.trim() || undefined,
          focusAreas:
            data.focusAreas && data.focusAreas.length
              ? data.focusAreas
              : undefined,
          distractorComplexity: data.distractorComplexity || undefined,
          expectedResponseLength: data.expectedResponseLength || undefined,
          evaluationCriteria:
            data.evaluationCriteria && data.evaluationCriteria.length
              ? data.evaluationCriteria
              : undefined,
          language: data.language?.trim() || undefined,
          bugType: data.bugType || undefined,
          codeComplexity: data.codeComplexity || undefined,
        } as CreatePresetInput;

        const result = preset
          ? await updatePresetAction(preset.id!, normalizedData)
          : await createPresetAction(normalizedData);

        if (result && !result.success) {
          toast.error(result.error || "Something went wrong");
        } else if (result && result.success && result.presetId) {
          // Redirect on success
          router.push(`/dashboard/presets/${result.presetId}`);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Something went wrong",
        );
      }
    });
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
    >
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Core Info & AI Instructions */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <div className="bg-card/50 shadow-sm p-6 border rounded-xl">
            <h3 className="mb-4 font-heading font-semibold text-foreground/90 text-lg">
              Informazioni Principali
            </h3>
            <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
              <InputField
                control={form.control}
                name="name"
                label="Nome preset"
                required
                placeholder="es. react-hooks"
                description="Identificatore univoco per il preset"
              />

              <InputField
                control={form.control}
                name="label"
                label="Etichetta visualizzata"
                required
                placeholder="es. Esperto React Hooks"
                description="Nome leggibile dall'uomo"
              />
            </div>
            <div className="mt-6">
              <TextareaField
                control={form.control}
                name="description"
                label="Descrizione"
                placeholder="Descrivi a cosa serve questo preset..."
                description="Descrizione opzionale del preset"
              />
            </div>
          </div>

          <div className="bg-card/50 shadow-sm p-6 border rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 font-heading font-semibold text-foreground/90 text-lg">
              <span className="text-primary">✨</span> Istruzioni AI
            </h3>
            <TextareaField
              control={form.control}
              name="instructions"
              label="Prompt di sistema"
              placeholder="Ulteriori indicazioni per l'AI durante la generazione delle domande"
              description="Aiuta l'AI a concentrarsi su requisiti o pattern specifici"
              className="min-h-[150px] font-mono text-sm"
            />
          </div>

          {/* Dynamic Sections Based on Type */}
          {questionType === "multiple_choice" && (
            <div className="group relative space-y-4 bg-card/30 p-6 border rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 pointer-events-none" />
              <h3 className="z-10 relative font-heading font-medium text-base">
                Configurazione Scelta Multipla
              </h3>
              <div className="z-10 relative space-y-4">
                <InputWithTagField
                  control={form.control}
                  name="focusAreas"
                  label="Aree di focus"
                  placeholder="Premi invio dopo ogni parola"
                  description="Aree tematiche su cui l'AI dovrebbe concentrarsi"
                />
                <SelectField
                  control={form.control}
                  name="distractorComplexity"
                  label="Complessità distrattori"
                  options={DISTRACTOR_COMPLEXITY_OPTIONS}
                  description="Difficoltà nel distinguere le opzioni sbagliate"
                />
              </div>
            </div>
          )}

          {(questionType === "open_question" ||
            questionType === "behavioral_scenario") && (
            <div className="space-y-4 bg-card/30 p-6 border rounded-xl">
              <h3 className="font-heading font-medium text-base">
                Configurazione Domanda Aperta / Scenario
              </h3>
              <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
                <SelectField
                  control={form.control}
                  name="expectedResponseLength"
                  label="Lunghezza risposta"
                  options={EXPECTED_RESPONSE_LENGTH_OPTIONS}
                  description="Dettaglio richiesto nella risposta"
                  placeholder="Seleziona una lunghezza"
                />
                <InputWithTagField
                  control={form.control}
                  name="evaluationCriteria"
                  label="Criteri di valutazione"
                  placeholder="Premi invio dopo ogni criterio"
                  description="Criteri per il rubric di punteggio automatico"
                />
              </div>
            </div>
          )}

          {questionType === "code_snippet" && (
            <div className="space-y-4 bg-card/30 p-6 border rounded-xl">
              <h3 className="font-heading font-medium text-base">
                Configurazione Snippet
              </h3>
              <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
                <InputField
                  control={form.control}
                  name="language"
                  label="Linguaggio"
                  placeholder="es. typescript"
                  description="Linguaggio dello snippet"
                />
                <SelectField
                  control={form.control}
                  name="bugType"
                  label="Tipo di bug"
                  options={BUG_TYPE_OPTIONS}
                  description="Problema da includere"
                  placeholder="Seleziona tipo bug"
                />
                <SelectField
                  control={form.control}
                  name="codeComplexity"
                  label="Complessità"
                  options={CODE_COMPLEXITY_OPTIONS}
                  description="Lunghezza e difficoltà del codice"
                  placeholder="Seleziona complessità"
                />
              </div>
              <div className="pt-2">
                <SwitchField
                  control={form.control}
                  name="includeComments"
                  label="Includi commenti"
                  description="Lo snippet dovrebbe contenere commenti inline?"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Settings & Actions */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <div className="top-6 sticky bg-card/50 shadow-sm p-6 border rounded-xl">
            <h3 className="mb-4 font-heading font-semibold text-foreground/90 text-lg">
              Impostazioni
            </h3>
            <div className="space-y-6">
              <SelectField
                control={form.control}
                name="icon"
                label="Icona"
                required
                options={PRESET_ICON_OPTIONS.map((icon) => ({
                  value: icon.value,
                  label: icon.label,
                  leading: (
                    <icon.icon
                      className="size-4 text-primary"
                      aria-hidden="true"
                    />
                  ),
                }))}
                description="Visualizzata nelle card"
              />

              <SelectField
                control={form.control}
                name="questionType"
                label="Tipo domanda"
                required
                options={QUESTION_TYPES}
                description="Formato output generato"
              />

              <SliderField
                control={form.control}
                name="difficulty"
                label="Livello difficoltà"
                required
                min={1}
                max={5}
                step={1}
                description="1 = Principiante, 5 = Esperto"
              />

              <MultiSelectField
                control={form.control}
                name="tags"
                label="Tag"
                required
                options={COMMON_TAGS.map((tag) => ({
                  value: tag,
                  label: tag,
                }))}
                description="Categoria del preset"
              />

              <div className="flex flex-col gap-3 pt-6 border-t">
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending
                    ? "Salvataggio..."
                    : preset
                      ? "Aggiorna Preset"
                      : "Crea Preset"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="w-full"
                >
                  Annulla
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
