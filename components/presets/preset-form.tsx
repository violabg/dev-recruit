"use client";
import {
  InputField,
  InputWithTagField,
  MultiSelectField,
  SelectField,
  SliderField,
  SwitchField,
  TextareaField,
} from "@/components/rhf-inputs";
import { Button } from "@/components/ui/button";
import { createPresetAction, updatePresetAction } from "@/lib/actions/presets";
import { type Preset } from "@/lib/data/presets";
import { createPresetSchema, type CreatePresetInput } from "@/lib/schemas";
import { PRESET_ICON_OPTIONS } from "@/lib/utils/preset-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { type z } from "zod/v4";

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Scelta multipla" },
  { value: "code_snippet", label: "Snippet di codice" },
  { value: "open_question", label: "Domanda aperta" },
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
  { value: "", label: "Non specificato" },
  { value: "short", label: "Breve" },
  { value: "medium", label: "Media" },
  { value: "long", label: "Lunga" },
];

const BUG_TYPE_OPTIONS = [
  { value: "", label: "Non specificato" },
  { value: "syntax", label: "Sintassi" },
  { value: "logic", label: "Logica" },
  { value: "performance", label: "Performance" },
  { value: "security", label: "Sicurezza" },
];

const CODE_COMPLEXITY_OPTIONS = [
  { value: "", label: "Non specificato" },
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
          error instanceof Error ? error.message : "Something went wrong"
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

      <TextareaField
        control={form.control}
        name="description"
        label="Descrizione"
        placeholder="Descrivi a cosa serve questo preset..."
        description="Descrizione opzionale del preset"
      />

      <TextareaField
        control={form.control}
        name="instructions"
        label="Istruzioni AI"
        placeholder="Ulteriori indicazioni per l'AI durante la generazione delle domande"
        description="Aiuta l'AI a concentrarsi su requisiti o pattern specifici"
      />

      <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
        <SelectField
          control={form.control}
          name="icon"
          label="Icona"
          required
          options={PRESET_ICON_OPTIONS.map((icon) => ({
            value: icon.value,
            label: icon.label,
            leading: (
              <icon.icon className="size-4 text-primary" aria-hidden="true" />
            ),
          }))}
          description="Scegli un'icona da lucide-react"
        />

        <SelectField
          control={form.control}
          name="questionType"
          label="Tipo di domanda"
          required
          options={QUESTION_TYPES}
          description="Tipo di domande generate da questo preset"
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
      </div>

      <MultiSelectField
        control={form.control}
        name="tags"
        label="Tag"
        required
        options={COMMON_TAGS.map((tag) => ({
          value: tag,
          label: tag,
        }))}
        description="Seleziona tag rilevanti per questo preset"
      />

      {questionType === "multiple_choice" && (
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-medium text-base">Opzioni scelta multipla</h3>
          <div>
            <InputWithTagField
              control={form.control}
              name="focusAreas"
              label="Aree di focus"
              placeholder="Premi invio dopo ogni parola"
              description="Aree tematiche su cui l'AI dovrebbe concentrarsi durante la generazione delle domande"
            />
          </div>

          <SelectField
            control={form.control}
            name="distractorComplexity"
            label="Complessità distrattori"
            options={DISTRACTOR_COMPLEXITY_OPTIONS}
            description="Quanto dovrebbero essere difficili da distinguere le opzioni sbagliate"
          />
        </div>
      )}

      {questionType === "open_question" && (
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-medium text-base">Opzioni domanda aperta</h3>
          <SelectField
            control={form.control}
            name="expectedResponseLength"
            label="Lunghezza risposta attesa"
            options={EXPECTED_RESPONSE_LENGTH_OPTIONS}
            description="Lascia che l'AI sappia quanto dettagliata dovrebbe essere la risposta"
          />
          <InputWithTagField
            control={form.control}
            name="evaluationCriteria"
            label="Criteri di valutazione"
            placeholder="Premi invio dopo ogni criterio"
            description="Criteri per valutare le risposte aperte (es. correttezza, profondità, chiarezza). L'AI li userà per generare un rubric di punteggio."
          />
        </div>
      )}

      {questionType === "code_snippet" && (
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-medium text-base">Opzioni snippet di codice</h3>
          <InputField
            control={form.control}
            name="language"
            label="Linguaggio primario"
            placeholder="es. typescript"
            description="Linguaggio che lo snippet buggy dovrebbe usare"
          />

          <SelectField
            control={form.control}
            name="bugType"
            label="Tipo di bug"
            options={BUG_TYPE_OPTIONS}
            description="Che tipo di problema dovrebbe includere lo snippet"
          />

          <SelectField
            control={form.control}
            name="codeComplexity"
            label="Complessità codice"
            options={CODE_COMPLEXITY_OPTIONS}
            description="Aiuta a regolare la lunghezza e la difficoltà dello snippet"
          />

          <SwitchField
            control={form.control}
            name="includeComments"
            label="Includi commenti"
            description="Se lo snippet dovrebbe contenere commenti inline"
          />
        </div>
      )}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
        >
          Annulla
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvataggio..."
            : preset
            ? "Aggiorna preset"
            : "Crea preset"}
        </Button>
      </div>
    </form>
  );
}
