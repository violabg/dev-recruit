"use client";

import { InputField, SelectField } from "@/components/rhf-inputs";
import { Button } from "@/components/ui/button";
import { createCandidate, updateCandidate } from "@/lib/actions/candidates";
import { Candidate } from "@/lib/prisma/client";
import {
  CandidateFormData,
  CandidateUpdateData,
  candidateFormSchema,
  candidateUpdateSchema,
} from "@/lib/schemas/candidate";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "In attesa" },
  { value: "contacted", label: "Contattato" },
  { value: "interviewing", label: "In colloquio" },
  { value: "hired", label: "Assunto" },
  { value: "rejected", label: "Rifiutato" },
];

type CandidateFormProps =
  | {
      mode: "new";
      positions: { id: string; title: string }[];
      defaultPositionId?: string;
    }
  | {
      mode: "edit";
      positions: { id: string; title: string }[];
      candidate: Pick<
        Candidate,
        "id" | "name" | "email" | "positionId" | "status" | "resumeUrl"
      >;
    };

export const CandidateForm = (props: CandidateFormProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEditMode = props.mode === "edit";

  const form = useForm<CandidateFormData | CandidateUpdateData>({
    resolver: zodResolver(
      isEditMode ? candidateUpdateSchema : candidateFormSchema
    ),
    defaultValues: isEditMode
      ? {
          name: props.candidate.name,
          email: props.candidate.email,
          position_id: props.candidate.positionId,
          status: props.candidate.status as any,
          resume_url: props.candidate.resumeUrl ?? "",
        }
      : {
          name: "",
          email: "",
          position_id: props.defaultPositionId || props.positions[0]?.id || "",
          resume_url: "",
        },
  });

  // Reset form when mode changes or when defaultPositionId changes
  useEffect(() => {
    if (!isEditMode && "defaultPositionId" in props) {
      form.reset({
        name: "",
        email: "",
        position_id: props.defaultPositionId || props.positions[0]?.id || "",
        resume_url: "",
      });
    }
  }, [isEditMode, props.positions, form]);

  const handleFormSubmission = (
    values: CandidateFormData | CandidateUpdateData
  ) => {
    setError(null);
    const formData = new FormData();

    if (values.name !== undefined) {
      formData.append("name", values.name);
    }

    if (values.email !== undefined) {
      formData.append("email", values.email);
    }

    if (values.position_id !== undefined) {
      formData.append("position_id", values.position_id);
    }

    if (isEditMode) {
      const updateValues = values as CandidateUpdateData;

      if (updateValues.status !== undefined) {
        formData.append("status", updateValues.status);
      }

      if (updateValues.resume_url !== undefined) {
        formData.append("resume_url", updateValues.resume_url ?? "");
      }

      startTransition(async () => {
        try {
          const response = await updateCandidate(props.candidate.id, formData);
          if (!response.success) {
            throw new Error("Nessun aggiornamento rilevato");
          }
          router.push(`/dashboard/candidates/${props.candidate.id}`);
        } catch (submitError: unknown) {
          setError(
            submitError instanceof Error
              ? submitError.message
              : "Errore durante l'aggiornamento del candidato"
          );
        }
      });

      return;
    }

    const createValues = values as CandidateFormData;

    startTransition(async () => {
      try {
        if (createValues.resume_url !== undefined) {
          formData.append("resume_url", createValues.resume_url ?? "");
        }

        const response = await createCandidate(formData);
        if (response?.candidateId) {
          router.push(`/dashboard/candidates/${response.candidateId}`);
        } else {
          router.push("/dashboard/candidates");
        }
      } catch (submitError: unknown) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Errore nella creazione del candidato"
        );
      }
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleFormSubmission)}
      className="space-y-6"
    >
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
        options={props.positions.map((position) => ({
          value: position.id,
          label: position.title,
        }))}
      />
      <InputField
        control={form.control}
        name="resume_url"
        label="URL curriculum"
        placeholder="https://"
        type="url"
      />
      {isEditMode && (
        <>
          <SelectField
            control={form.control}
            name="status"
            label="Stato"
            placeholder="Seleziona stato"
            options={STATUS_OPTIONS}
          />
        </>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            {isEditMode ? "Salvataggio in corso..." : "Creazione in corso..."}
          </>
        ) : isEditMode ? (
          "Aggiorna candidato"
        ) : (
          "Crea candidato"
        )}
      </Button>
    </form>
  );
};
