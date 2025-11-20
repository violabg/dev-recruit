"use client";
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
import { createPosition } from "@/lib/actions/positions";
import { PositionFormData, positionFormSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
  tools,
} from "./data";

export function NewPositionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionFormSchema),
    defaultValues: {
      title: "",
      description: "",
      experience_level: "",
      skills: [],
      soft_skills: [],
      contract_type: "",
    },
  });
  const {
    handleSubmit,
    register,
    control,
    formState: { errors },
  } = form;
  const titleId = useId();
  const descriptionId = useId();
  const experienceLevelId = useId();
  const skillsId = useId();
  const softSkillsId = useId();
  const contractTypeId = useId();

  async function onSubmit(values: PositionFormData) {
    setIsSubmitting(true);

    try {
      await createPosition(values);
    } catch (error) {
      console.error("Error creating position:", error);
      setIsSubmitting(false);
    }
  }

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
                value={field.value}
                defaultValue={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger id={experienceLevelId} className="w-full">
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
                options={allSkills}
                selected={field.value || []}
                onChange={field.onChange}
                placeholder="Seleziona soft skills..."
              />
            )}
          />
        </FieldContent>
        <FieldDescription>
          Seleziona le soft skills richieste per questa posizione
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
                <SelectTrigger id={contractTypeId} className="w-full">
                  <SelectValue placeholder="Seleziona un contratto" />
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
        <FieldDescription>
          Indica il tipo di contratto previsto
        </FieldDescription>
        <FieldError
          id={`${contractTypeId}-error`}
          errors={errors.contract_type ? [errors.contract_type] : undefined}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            Creazione in corso...
          </>
        ) : (
          "Crea posizione"
        )}
      </Button>
    </form>
  );
}
