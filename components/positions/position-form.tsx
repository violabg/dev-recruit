"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectItem } from "@/components/ui/select";
import { createPosition, updatePosition } from "@/lib/actions/positions";
import { Position } from "@/lib/prisma/client";
import {
  PositionFormData,
  positionFormSchema,
  type PositionDescriptionInput,
} from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Brain, Briefcase, Loader2, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { InputField } from "../ui/rhf-inputs/input-field";
import { MultiSelectField } from "../ui/rhf-inputs/multi-select-field";
import { SelectField } from "../ui/rhf-inputs/select-field";
import { TextareaField } from "../ui/rhf-inputs/textarea-field";

type PositionFormProps = {
  position?: Position;
  onCancel?: () => void;
  allSkills?: { label: string; value: string; category: string }[];
  allSoftSkills?: { label: string; value: string }[];
  experienceLevels?: string[];
  contractTypes?: string[];
};

export function PositionForm({
  position,
  onCancel,
  allSkills = [],
  allSoftSkills = [],
  experienceLevels = [],
  contractTypes = [],
}: PositionFormProps) {
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();
  const [isGeneratingDescription, startDescriptionGeneration] = useTransition();

  const isEditing = !!position;

  const pathname = usePathname();

  const defaultValues = useMemo(
    () =>
      isEditing
        ? {
            title: position.title,
            description: position.description || "",
            experienceLevel: position.experienceLevel,
            skills: position.skills || [],
            softSkills: position.softSkills || [],
            contractType: position.contractType || "",
          }
        : {
            title: "",
            description: "",
            experienceLevel: "",
            skills: [],
            softSkills: [],
            contractType: "",
          },
    [isEditing, position],
  );

  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionFormSchema),
    defaultValues,
  });

  const { control, handleSubmit, getValues, setValue } = form;

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form, pathname]);

  async function onSubmit(values: PositionFormData) {
    startTransition(async () => {
      try {
        if (isEditing) {
          const formData = new FormData();
          formData.append("title", values.title);
          formData.append("description", values.description || "");
          formData.append("experienceLevel", values.experienceLevel);
          formData.append("skills", JSON.stringify(values.skills));
          formData.append(
            "softSkills",
            JSON.stringify(values.softSkills || []),
          );
          formData.append("contractType", values.contractType || "");

          await updatePosition(position!.id, formData);
        } else {
          await createPosition(values);
        }
      } catch (error) {
        console.error("Error submitting position:", error);
      }
    });
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  async function handleGenerateDescription() {
    startDescriptionGeneration(async () => {
      try {
        const descriptionPayload: PositionDescriptionInput = {
          title: getValues("title"),
          experienceLevel: getValues("experienceLevel"),
          skills: getValues("skills"),
          softSkills: getValues("softSkills"),
          contractType: getValues("contractType"),
          currentDescription: getValues("description"),
        };

        // Clear current description before streaming
        setValue("description", "");

        const response = await fetch("/api/positions/generate-description", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(descriptionPayload),
        });

        if (!response.ok) {
          throw new Error("Failed to generate description");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          setValue("description", accumulatedText);
        }

        toast.success("Descrizione generata con successo");
      } catch (error) {
        console.error("Errore generazione descrizione:", error);
        const message =
          error instanceof Error ? error.message : "Errore sconosciuto";
        toast.error("Impossibile generare la descrizione", {
          description: message,
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Core Info & Description */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="size-5 text-primary" />
                Dettagli Posizione
              </CardTitle>
            </CardHeader>
            <CardContent className="gap-6 grid grid-cols-1 md:grid-cols-2">
              <div className="md:col-span-2">
                <InputField<PositionFormData>
                  name="title"
                  control={control}
                  label="Titolo della posizione"
                  required
                  placeholder="es. Sviluppatore Frontend React"
                  description="Inserisci un titolo chiaro e descrittivo"
                />
              </div>

              <SelectField<PositionFormData>
                control={control}
                name="contractType"
                label="Tipo di contratto"
                description="Indica il tipo di contratto previsto"
                placeholder="Seleziona un contratto"
                triggerProps={{
                  className: "w-full",
                }}
              >
                {contractTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectField>

              <SelectField<PositionFormData>
                control={control}
                name="experienceLevel"
                label="Livello di esperienza"
                required
                description="Indica il livello di esperienza richiesto"
                placeholder="Seleziona un livello"
                triggerProps={{
                  className: "w-full",
                }}
              >
                {experienceLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectField>
            </CardContent>
          </Card>

          <Card className="relative bg-primary/5 dark:bg-primary/10 border-primary/20 overflow-hidden">
            <div className="top-0 right-0 absolute opacity-10 p-4">
              <Sparkles className="size-24 text-primary" />
            </div>
            <CardHeader className="z-10 relative pb-0">
              <CardTitle className="flex items-center gap-2 text-primary text-lg">
                <Sparkles className="size-5" />
                Descrizione IA
              </CardTitle>
            </CardHeader>
            <CardContent className="z-10 relative space-y-4 pt-4">
              <TextareaField<PositionFormData>
                control={control}
                name="description"
                label="Job Description"
                description="Descrivi dettagliatamente la posizione. L'IA può aiutarti."
                placeholder="Descrivi la posizione, le responsabilità e i requisiti..."
                className="bg-background/50 backdrop-blur-sm min-h-48"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription || isSubmitting}
                  className="bg-primary/10 hover:bg-primary/20 shadow-none border border-primary/20 text-primary"
                >
                  {isGeneratingDescription ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-4" />
                      Genera con IA
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Skills & Actions */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card className="top-6 sticky">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="size-5 text-primary" />
                Competenze
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <MultiSelectField<PositionFormData>
                control={control}
                name="skills"
                label="Tech Stack"
                required
                description="Competenze tecniche richieste"
                options={allSkills}
                placeholder="Seleziona tech..."
                grouped
                showClear
              />
              <MultiSelectField<PositionFormData>
                control={control}
                name="softSkills"
                label="Soft Skills"
                description="Competenze traversali"
                options={allSoftSkills}
                placeholder="Seleziona soft skills..."
                showClear
              />

              <div className="flex flex-col gap-3 pt-6 border-t">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {isEditing ? "Salvataggio..." : "Creazione..."}
                    </>
                  ) : isEditing ? (
                    "Aggiorna posizione"
                  ) : (
                    "Crea posizione"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
