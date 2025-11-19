"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titolo della posizione</FormLabel>
              <FormControl>
                <Input
                  placeholder="es. Sviluppatore Frontend React"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Inserisci un titolo chiaro e descrittivo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descrivi la posizione, le responsabilità e i requisiti"
                  className="min-h-32"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Fornisci dettagli sulla posizione e sulle responsabilità
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="experience_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Livello di esperienza</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un livello" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {experienceLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Indica il livello di esperienza richiesto
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Competenze tecniche</FormLabel>
              <FormControl>
                <MultiSelect
                  options={allSkills}
                  selected={field.value}
                  onChange={field.onChange}
                  placeholder="Seleziona competenze..."
                  grouped
                />
              </FormControl>
              <FormDescription>
                Seleziona le competenze tecniche richieste per questa posizione
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="soft_skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Soft skills</FormLabel>
              <FormControl>
                <MultiSelect
                  options={allSoftSkills}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Seleziona soft skills..."
                />
              </FormControl>
              <FormDescription>
                Seleziona le soft skills importanti per questa posizione
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contract_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo di contratto</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un tipo di contratto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {contractTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Indica il tipo di contratto offerto
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
    </Form>
  );
}
