"use client";

import { Button } from "@/components/ui/button";
import { SelectItem } from "@/components/ui/select";
import { createCandidate } from "@/lib/actions/candidates";
import { CandidateFormData, candidateFormSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { InputField, SelectField } from "@/components/rhf-inputs";

type CandidateNewFormProps = {
  positions: { id: string; title: string }[];
  defaultPositionId?: string;
};

export const CandidateNewForm = ({
  positions,
  defaultPositionId,
}: CandidateNewFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CandidateFormData>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: {
      name: "",
      email: "",
      position_id: defaultPositionId || positions[0]?.id || "",
    },
  });

  const onSubmit = async (values: CandidateFormData) => {
    setError(null);
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("email", values.email);
    formData.append("position_id", values.position_id);
    startTransition(async () => {
      try {
        const res = await createCandidate(formData);
        if (res?.candidateId) {
          router.push(`/dashboard/candidates/${res.candidateId}`);
        } else {
          router.push("/dashboard/candidates");
        }
      } catch (e: unknown) {
        setError(
          e instanceof Error
            ? e.message
            : "Errore nella creazione del candidato"
        );
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <InputField
        control={form.control}
        name="name"
        label="Nome"
        placeholder="Nome candidato"
      />
      <InputField
        control={form.control}
        name="email"
        label="Email"
        placeholder="Email candidato"
        type="email"
      />
      <SelectField
        control={form.control}
        name="position_id"
        label="Posizione"
        placeholder="Seleziona posizione"
      >
        {positions.map((position) => (
          <SelectItem key={position.id} value={position.id}>
            {position.title}
          </SelectItem>
        ))}
      </SelectField>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            Creazione in corso...
          </>
        ) : (
          "Crea candidato"
        )}
      </Button>
    </form>
  );
};
