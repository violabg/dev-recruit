"use client";
import { Button } from "@/components/ui/button";
import { SelectItem } from "@/components/ui/select";
import { createPosition, updatePosition } from "@/lib/actions/positions";
import { Position } from "@/lib/prisma/client";
import {
  PositionFormData,
  positionFormSchema,
  type PositionDescriptionInput,
} from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { InputField } from "../rhf-inputs/input-field";
import { MultiSelectField } from "../rhf-inputs/multi-select-field";
import { SelectField } from "../rhf-inputs/select-field";
import { TextareaField } from "../rhf-inputs/textarea-field";
import {
  contractTypes,
  databases,
  experienceLevels,
  frameworks,
  programmingLanguages,
  softSkills,
  tools,
} from "./data";

// Combine all skills for the MultiSelect component
const allSkills = [
  ...programmingLanguages.map((skill) => ({
    label: skill,
    value: skill,
    category: "Linguaggi",
  })),
  ...frameworks.map((skill) => ({
    label: skill,
    value: skill,
    category: "Framework",
  })),
  ...databases.map((skill) => ({
    label: skill,
    value: skill,
    category: "Database",
  })),
  ...tools.map((skill) => ({ label: skill, value: skill, category: "Tool" })),
];

const allSoftSkills = softSkills.map((skill) => ({
  label: skill,
  value: skill,
}));

type PositionFormProps = {
  position?: Position;
  onCancel?: () => void;
};

export function PositionForm({ position, onCancel }: PositionFormProps) {
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();
  const [isGeneratingDescription, startDescriptionGeneration] = useTransition();

  const isEditing = !!position;

  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionFormSchema),
    defaultValues: isEditing
      ? {
          title: position.title,
          description: position.description || "",
          experience_level: position.experienceLevel,
          skills: position.skills || [],
          soft_skills: position.softSkills || [],
          contract_type: position.contractType || "",
        }
      : {
          title: "",
          description: "",
          experience_level: "",
          skills: [],
          soft_skills: [],
          contract_type: "",
        },
  });

  const { control, handleSubmit, getValues, setValue } = form;

  async function onSubmit(values: PositionFormData) {
    startTransition(async () => {
      try {
        if (isEditing) {
          const formData = new FormData();
          formData.append("title", values.title);
          formData.append("description", values.description || "");
          formData.append("experience_level", values.experience_level);
          formData.append("skills", JSON.stringify(values.skills));
          formData.append(
            "soft_skills",
            JSON.stringify(values.soft_skills || [])
          );
          formData.append("contract_type", values.contract_type || "");

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
          experience_level: getValues("experience_level"),
          skills: getValues("skills"),
          soft_skills: getValues("soft_skills"),
          contract_type: getValues("contract_type"),
          current_description: getValues("description"),
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <InputField<PositionFormData>
        name="title"
        control={control}
        label="Titolo della posizione"
        placeholder="es. Sviluppatore Frontend React"
        description="Inserisci un titolo chiaro e descrittivo"
      />
      <SelectField<PositionFormData>
        control={control}
        name="experience_level"
        label="Livello di esperienza"
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
      <MultiSelectField<PositionFormData>
        control={control}
        name="skills"
        label="Competenze tecniche"
        description="Seleziona le competenze tecniche richieste per questa posizione"
        options={allSkills}
        placeholder="Seleziona competenze..."
      />
      <MultiSelectField<PositionFormData>
        control={control}
        name="soft_skills"
        label="Soft skills"
        description="Seleziona le soft skills richieste per questa posizione"
        options={allSoftSkills}
        placeholder="Seleziona soft skills..."
      />
      <SelectField<PositionFormData>
        control={control}
        name="contract_type"
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

      <div className="space-y-2">
        <TextareaField<PositionFormData>
          control={control}
          name="description"
          label="Descrizione"
          description="Forinisci dettagli sulla posizione e sulle responsabilità"
          placeholder="Descrivi la posizione, le responsabilità e i requisiti"
          className="min-h-32"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateDescription}
            disabled={isGeneratingDescription || isSubmitting}
          >
            {isGeneratingDescription ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Generazione in corso...
              </>
            ) : (
              <>
                <Sparkles className="ml-2 w-4 h-4 text-primary" />
                Genera descrizione
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Annulla
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              {isEditing
                ? "Aggiornamento in corso..."
                : "Creazione in corso..."}
            </>
          ) : isEditing ? (
            "Aggiorna posizione"
          ) : (
            "Crea posizione"
          )}
        </Button>
      </div>
    </form>
  );
}
