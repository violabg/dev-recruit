"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCandidate } from "@/lib/actions/candidates";
import { CandidateFormData, candidateFormSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

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
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>Nome</FieldLabel>
            <FieldContent>
              <Input placeholder="Nome candidato" {...field} />
            </FieldContent>
            <FieldError
              errors={fieldState.error ? [fieldState.error] : undefined}
            />
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>Email</FieldLabel>
            <FieldContent>
              <Input placeholder="Email candidato" type="email" {...field} />
            </FieldContent>
            <FieldError
              errors={fieldState.error ? [fieldState.error] : undefined}
            />
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="position_id"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>Posizione</FieldLabel>
            <FieldContent>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona posizione" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
            <FieldError
              errors={fieldState.error ? [fieldState.error] : undefined}
            />
          </Field>
        )}
      />
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
