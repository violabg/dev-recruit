"use client";
import { Button } from "@/components/ui/button";
import { SelectItem } from "@/components/ui/select";
import { createPosition, updatePosition } from "@/lib/actions/positions";
import { Position } from "@/lib/prisma/client";
import { PositionFormData, positionFormSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
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
  const [isPending, startTransition] = useTransition();

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

  const { control, handleSubmit } = form;

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <InputField<PositionFormData>
        name="title"
        control={control}
        label="Titolo della posizione"
        placeholder="es. Sviluppatore Frontend React"
        description="Inserisci un titolo chiaro e descrittivo"
      />
      <TextareaField<PositionFormData>
        control={control}
        name="description"
        label="Descrizione"
        description="Forinisci dettagli sulla posizione e sulle responsabilità"
        placeholder="Descrivi la posizione, le responsabilità e i requisiti"
        className="min-h-32"
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

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isPending}
        >
          Annulla
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
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
