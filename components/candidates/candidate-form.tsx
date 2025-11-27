"use client";

import {
  FileUploadField,
  InputField,
  SelectField,
} from "@/components/rhf-inputs";
import { Button } from "@/components/ui/button";
import { createCandidate, updateCandidate } from "@/lib/actions/candidates";
import { Candidate } from "@/lib/prisma/client";
import {
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
        | "id"
        | "firstName"
        | "lastName"
        | "email"
        | "dateOfBirth"
        | "positionId"
        | "status"
        | "resumeUrl"
      >;
    };

export const CandidateForm = (props: CandidateFormProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeExistingResume, setRemoveExistingResume] = useState(false);
  const isEditMode = props.mode === "edit";

  // Use appropriate schema and type based on mode
  const schema = isEditMode ? candidateUpdateSchema : candidateFormSchema;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEditMode
      ? {
          firstName: props.candidate.firstName,
          lastName: props.candidate.lastName,
          email: props.candidate.email,
          dateOfBirth: props.candidate.dateOfBirth ?? undefined,
          positionId: props.candidate.positionId,
          status: props.candidate.status as
            | "pending"
            | "contacted"
            | "interviewing"
            | "hired"
            | "rejected",
        }
      : {
          firstName: "",
          lastName: "",
          email: "",
          positionId: props.defaultPositionId || props.positions[0]?.id || "",
        },
  });

  // Reset form when mode changes or when defaultPositionId changes
  const defaultPositionId =
    !isEditMode && "defaultPositionId" in props
      ? props.defaultPositionId
      : undefined;
  const firstPositionId = props.positions[0]?.id;
  useEffect(() => {
    if (!isEditMode) {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        positionId: defaultPositionId || firstPositionId || "",
      });
      setSelectedFile(null);
      setRemoveExistingResume(false);
    }
  }, [isEditMode, defaultPositionId, firstPositionId, form]);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      setRemoveExistingResume(false);
    }
  };

  const handleRemoveExisting = () => {
    setRemoveExistingResume(true);
    setSelectedFile(null);
  };

  const handleFormSubmission = (values: Record<string, unknown>) => {
    setError(null);
    const formData = new FormData();

    if (values.firstName !== undefined) {
      formData.append("firstName", String(values.firstName));
    }

    if (values.lastName !== undefined) {
      formData.append("lastName", String(values.lastName));
    }

    if (values.email !== undefined) {
      formData.append("email", String(values.email));
    }

    if (values.positionId !== undefined) {
      formData.append("positionId", String(values.positionId));
    }

    if (values.dateOfBirth !== undefined && values.dateOfBirth !== null) {
      formData.append(
        "dateOfBirth",
        values.dateOfBirth instanceof Date
          ? values.dateOfBirth.toISOString()
          : String(values.dateOfBirth)
      );
    }

    // Handle file upload
    if (selectedFile) {
      formData.append("resumeFile", selectedFile);
    }

    if (isEditMode) {
      if (values.status !== undefined) {
        formData.append("status", String(values.status));
      }

      // Flag to remove existing resume
      if (removeExistingResume) {
        formData.append("removeResume", "true");
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

    startTransition(async () => {
      try {
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
      <div className="gap-4 grid sm:grid-cols-2">
        <InputField
          control={form.control}
          name="firstName"
          label="Nome"
          placeholder="Nome"
        />
        <InputField
          control={form.control}
          name="lastName"
          label="Cognome"
          placeholder="Cognome"
        />
      </div>
      <InputField
        control={form.control}
        name="email"
        label="Email"
        placeholder="Email candidato"
        type="email"
      />
      <InputField
        control={form.control}
        name="dateOfBirth"
        label="Data di nascita"
        type="date"
      />
      <SelectField
        control={form.control}
        name="positionId"
        label="Posizione"
        placeholder="Seleziona posizione"
        options={props.positions.map((position) => ({
          value: position.id,
          label: position.title,
        }))}
      />
      <FileUploadField
        currentFileUrl={
          isEditMode && !removeExistingResume
            ? props.candidate.resumeUrl
            : undefined
        }
        onFileSelect={handleFileSelect}
        onRemoveExisting={isEditMode ? handleRemoveExisting : undefined}
        isUploading={isPending}
        disabled={isPending}
      />

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
