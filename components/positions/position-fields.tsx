"use client";

/**
 * Fields of the position form, shared by the dashboard form (PositionForm)
 * and the MCP App position form widget (mcp-apps/react). No Next.js import:
 * the widget bundle runs outside the app.
 */

import { SelectItem } from "@/components/ui/select";
import type { PositionFormData } from "@/lib/schemas";
import type { Control } from "react-hook-form";
import { InputField } from "../ui/rhf-inputs/input-field";
import { MultiSelectField } from "../ui/rhf-inputs/multi-select-field";
import { SelectField } from "../ui/rhf-inputs/select-field";
import { TextareaField } from "../ui/rhf-inputs/textarea-field";

/** Reference data the position fields choose from */
export interface PositionFieldOptions {
  allSkills: { label: string; value: string; category: string }[];
  allSoftSkills: { label: string; value: string }[];
  experienceLevels: string[];
  contractTypes: string[];
}

type FieldsProps = { control: Control<PositionFormData> };

export function PositionTitleField({ control }: FieldsProps) {
  return (
    <InputField<PositionFormData>
      name="title"
      control={control}
      label="Titolo della posizione"
      required
      placeholder="es. Sviluppatore Frontend React"
      description="Inserisci un titolo chiaro e descrittivo"
    />
  );
}

export function PositionContractField({
  control,
  contractTypes,
}: FieldsProps & Pick<PositionFieldOptions, "contractTypes">) {
  return (
    <SelectField<PositionFormData>
      control={control}
      name="contractType"
      label="Tipo di contratto"
      description="Indica il tipo di contratto previsto"
      placeholder="Seleziona un contratto"
      triggerProps={{ className: "w-full" }}
    >
      {contractTypes.map((type) => (
        <SelectItem key={type} value={type}>
          {type}
        </SelectItem>
      ))}
    </SelectField>
  );
}

export function PositionLevelField({
  control,
  experienceLevels,
}: FieldsProps & Pick<PositionFieldOptions, "experienceLevels">) {
  return (
    <SelectField<PositionFormData>
      control={control}
      name="experienceLevel"
      label="Livello di esperienza"
      required
      description="Indica il livello di esperienza richiesto"
      placeholder="Seleziona un livello"
      triggerProps={{ className: "w-full" }}
    >
      {experienceLevels.map((level) => (
        <SelectItem key={level} value={level}>
          {level}
        </SelectItem>
      ))}
    </SelectField>
  );
}

export function PositionDescriptionField({
  control,
  description = "Descrivi dettagliatamente la posizione. L'IA può aiutarti.",
  className,
}: FieldsProps & { description?: string; className?: string }) {
  return (
    <TextareaField<PositionFormData>
      control={control}
      name="description"
      label="Job Description"
      description={description}
      placeholder="Descrivi la posizione, le responsabilità e i requisiti..."
      className={className}
    />
  );
}

export function PositionSkillsFields({
  control,
  allSkills,
  allSoftSkills,
}: FieldsProps & Pick<PositionFieldOptions, "allSkills" | "allSoftSkills">) {
  return (
    <>
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
    </>
  );
}
