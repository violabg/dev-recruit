"use client";

import {
  FileUploadField,
  InputField,
  MultiSelectField,
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
      onPositionSelect?: (positionIds: string[]) => void;
    }
  | {
      mode: "apply";
      positions: { id: string; title: string }[];
      defaultPositionId?: string;
      onPositionSelect?: (positionIds: string[]) => void;
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
        | "status"
        | "resumeUrl"
      > & {
        positionIds: string[];
      };
      onPositionSelect?: (positionIds: string[]) => void;
    };

export const CandidateForm = (props: CandidateFormProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeExistingResume, setRemoveExistingResume] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isEditMode = props.mode === "edit";
  const isApplyMode = props.mode === "apply";

  // Use appropriate schema and type based on mode
  const schema = isEditMode ? candidateUpdateSchema : candidateFormSchema;

  const handleCancel = () => {
    router.back();
  };

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEditMode
      ? {
          firstName: props.candidate.firstName,
          lastName: props.candidate.lastName,
          email: props.candidate.email,
          dateOfBirth: props.candidate.dateOfBirth ?? undefined,
          positionIds: props.candidate.positionIds,
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
          positionIds: props.defaultPositionId ? [props.defaultPositionId] : [],
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
        positionIds: defaultPositionId ? [defaultPositionId] : [],
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

    if (values.positionIds !== undefined && Array.isArray(values.positionIds)) {
      formData.append("positionIds", JSON.stringify(values.positionIds));
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
        if (isApplyMode) {
          setIsSubmitted(true);
          return;
        }
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

  // Show success message after apply submission
  if (isApplyMode && isSubmitted) {
    return (
      <div className="py-8 text-center">
        <div className="flex justify-center items-center bg-green-100 dark:bg-green-900/30 mx-auto mb-4 rounded-full w-16 h-16">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="mb-2 font-semibold text-lg">Candidatura inviata!</h3>
        <p className="text-muted-foreground">
          Grazie per esserti candidato. Ti contatteremo presto per fornirti
          maggiori dettagli sul processo di selezione.
        </p>
      </div>
    );
  }

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
          required
          placeholder="Nome"
        />
        <InputField
          control={form.control}
          name="lastName"
          label="Cognome"
          required
          placeholder="Cognome"
        />
      </div>
      <InputField
        control={form.control}
        name="email"
        label="Email"
        required
        placeholder="Email candidato"
        type="email"
      />
      <InputField
        control={form.control}
        name="dateOfBirth"
        label="Data di nascita"
        type="date"
        className="w-auto"
      />
      <MultiSelectField
        control={form.control}
        name="positionIds"
        label="Posizioni"
        required
        placeholder="Seleziona una o più posizioni"
        options={props.positions.map((position) => ({
          value: position.id,
          label: position.title,
        }))}
        onChange={(values) => {
          if (props.onPositionSelect) {
            props.onPositionSelect(values);
          }
        }}
      />
      {isEditMode && (
        <SelectField
          control={form.control}
          name="status"
          label="Stato"
          placeholder="Seleziona stato"
          options={STATUS_OPTIONS}
          triggerProps={{ disabled: isPending, size: "default" }}
        />
      )}
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
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
        >
          Annulla
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {isEditMode
                ? "Salvataggio in corso..."
                : isApplyMode
                ? "Invio candidatura..."
                : "Creazione in corso..."}
            </>
          ) : isEditMode ? (
            "Aggiorna candidato"
          ) : isApplyMode ? (
            "Invia candidatura"
          ) : (
            "Crea candidato"
          )}
        </Button>
      </div>
    </form>
  );
};
