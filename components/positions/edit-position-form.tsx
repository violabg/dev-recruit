"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updatePosition } from "@/lib/actions/positions";
import { Position } from "@/lib/prisma/client";
import { PositionFormData, positionFormSchema } from "@/lib/schemas";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../ui/field";
import {
  contractTypes,
  databases,
  experienceLevels,
  frameworks,
  programmingLanguages,
  softSkills,
  tools,
} from "./data";

type EditPositionFormProps = {
  position: Position;
};

export function EditPositionForm({ position }: EditPositionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionFormSchema),
    defaultValues: {
      title: position.title,
      description: position.description || "",
      experience_level: position.experienceLevel,
      skills: position.skills || [],
      soft_skills: position.softSkills || [],
      contract_type: position.contractType || "",
    },
  });

  async function onSubmit(values: PositionFormData) {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description || "");
      formData.append("experience_level", values.experience_level);
      formData.append("skills", JSON.stringify(values.skills));
      formData.append("soft_skills", JSON.stringify(values.soft_skills || []));
      formData.append("contract_type", values.contract_type || "");

      await updatePosition(position.id, formData);
    } catch (error) {
      console.error("Error updating position:", error);
      setIsSubmitting(false);
    }
  }

  const {
    control,
    handleSubmit,
    formState: { errors },
    register,
  } = form;

  const titleId = useId();
  const descriptionId = useId();
  const experienceLevelId = useId();
  const skillsId = useId();
  const softSkillsId = useId();
  const contractTypeId = useId();

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Field>
        <FieldLabel htmlFor={titleId}>Titolo della posizione</FieldLabel>
        <FieldContent>
          <Input
            id={titleId}
            placeholder="es. Sviluppatore Frontend React"
            {...register("title")}
          />
        </FieldContent>
        <FieldDescription>
          Inserisci un titolo chiaro e descrittivo
        </FieldDescription>
        <FieldError
          id={`${titleId}-error`}
          errors={errors.title ? [errors.title] : undefined}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={descriptionId}>Descrizione</FieldLabel>
        <FieldContent>
          <Textarea
            id={descriptionId}
            placeholder="Descrivi la posizione, le responsabilità e i requisiti"
            className="min-h-32"
            {...register("description")}
          />
        </FieldContent>
        <FieldDescription>
          Fornisci dettagli sulla posizione e sulle responsabilità
        </FieldDescription>
        <FieldError
          id={`${descriptionId}-error`}
          errors={errors.description ? [errors.description] : undefined}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={experienceLevelId}>
          Livello di esperienza
        </FieldLabel>
        <FieldContent>
          <Controller
            control={control}
            name="experience_level"
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                defaultValue={field.value}
              >
                <SelectTrigger id={experienceLevelId}>
                  <SelectValue placeholder="Seleziona un livello" />
                </SelectTrigger>
                <SelectContent>
                  {experienceLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FieldContent>
        <FieldDescription>
          Indica il livello di esperienza richiesto
        </FieldDescription>
        <FieldError
          id={`${experienceLevelId}-error`}
          errors={
            errors.experience_level ? [errors.experience_level] : undefined
          }
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={skillsId}>Competenze tecniche</FieldLabel>
        <FieldContent>
          <Controller
            control={control}
            name="skills"
            render={({ field }) => (
              <MultiSelect
                options={allSkills}
                selected={field.value}
                onChange={field.onChange}
                placeholder="Seleziona competenze..."
                grouped
              />
            )}
          />
        </FieldContent>
        <FieldDescription>
          Seleziona le competenze tecniche richieste per questa posizione
        </FieldDescription>
        <FieldError
          id={`${skillsId}-error`}
          errors={errors.skills ? [errors.skills] : undefined}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={softSkillsId}>Soft skills</FieldLabel>
        <FieldContent>
          <Controller
            control={control}
            name="soft_skills"
            render={({ field }) => (
              <MultiSelect
                options={allSoftSkills}
                selected={field.value || []}
                onChange={field.onChange}
                placeholder="Seleziona soft skills..."
              />
            )}
          />
        </FieldContent>
        <FieldDescription>
          Seleziona le soft skills importanti per questa posizione
        </FieldDescription>
        <FieldError
          id={`${softSkillsId}-error`}
          errors={errors.soft_skills ? [errors.soft_skills] : undefined}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={contractTypeId}>Tipo di contratto</FieldLabel>
        <FieldContent>
          <Controller
            control={control}
            name="contract_type"
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                defaultValue={field.value}
              >
                <SelectTrigger id={contractTypeId}>
                  <SelectValue placeholder="Seleziona un tipo di contratto" />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FieldContent>
        <FieldDescription>Indica il tipo di contratto offerto</FieldDescription>
        <FieldError
          id={`${contractTypeId}-error`}
          errors={errors.contract_type ? [errors.contract_type] : undefined}
        />
      </Field>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annulla
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Aggiornamento in corso...
            </>
          ) : (
            "Aggiorna posizione"
          )}
        </Button>
      </div>
    </form>
  );
}
