"use client";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/rhf-inputs";
import {
  createReferenceDataAction,
  updateReferenceDataAction,
} from "@/lib/actions/reference-data";
import { type ReferenceCategory } from "@/lib/constants/reference-categories";
import {
  referenceDataFormSchema,
  type ReferenceDataFormData,
  type ReferenceDataFormInput,
} from "@/lib/schemas/reference-data";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
  const [isPending, startTransition] = useTransition();
  const itemId = defaultValues?.id;

  const form = useForm<ReferenceDataFormInput, unknown, ReferenceDataFormData>({
    resolver: zodResolver(referenceDataFormSchema),
    defaultValues: {
      category,
      label: defaultValues?.label || "",
      isActive: defaultValues?.isActive ?? true,
      order: defaultValues?.order ?? 0,
    },
  });

  const onSubmit = (data: ReferenceDataFormData) => {
    startTransition(async () => {
      const result = itemId
        ? await updateReferenceDataAction({ ...data, id: itemId })
        : await createReferenceDataAction(data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(itemId ? "Elemento aggiornato" : "Elemento creato");
      onSuccess?.();
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <InputField
        control={form.control}
        name="label"
        label="Etichetta"
        placeholder="Inserisci l'etichetta"
        required
      />

      <Button type="submit" disabled={isPending}>
        {itemId ? "Aggiorna" : "Crea"}
      </Button>
    </form>
  );
}
