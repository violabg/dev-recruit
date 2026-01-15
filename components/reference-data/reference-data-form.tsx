"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createReferenceDataAction,
  updateReferenceDataAction,
} from "@/lib/actions/reference-data";
import { type ReferenceCategory } from "@/lib/constants/reference-categories";
import {
  referenceDataFormSchema,
  type ReferenceDataFormData,
} from "@/lib/schemas/reference-data";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

interface ReferenceDataFormProps {
  category: ReferenceCategory;
  defaultValues?:
    | (Partial<ReferenceDataFormData> & { id?: string })
    | undefined;
  onSuccess?: () => void;
}

export function ReferenceDataForm({
  category,
  defaultValues,
  onSuccess,
}: ReferenceDataFormProps) {
  const form = useForm<ReferenceDataFormData>({
    // Cast resolver to satisfy RHF types with zod defaults
    resolver: zodResolver(referenceDataFormSchema) as any,
    defaultValues: {
      category,
      label: defaultValues?.label || "",
      isActive:
        defaultValues?.isActive !== undefined ? defaultValues.isActive : true,
      order: defaultValues?.order !== undefined ? defaultValues.order : 0,
    },
  });

  async function onSubmit(data: ReferenceDataFormData) {
    try {
      if (defaultValues?.id) {
        await updateReferenceDataAction({ ...data, id: defaultValues.id });
      } else {
        await createReferenceDataAction(data);
      }
      onSuccess?.();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
      <div>
        <Label htmlFor="label">Etichetta</Label>
        <Input
          id="label"
          {...form.register("label")}
          placeholder="Inserisci l'etichetta"
        />
        {form.formState.errors.label && (
          <p className="text-red-500 text-sm">
            {form.formState.errors.label.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {defaultValues?.id ? "Aggiorna" : "Crea"}
      </Button>
    </form>
  );
}
