"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputField,
  MultiSelectField,
  SwitchField,
  TextareaField,
} from "@/components/ui/rhf-inputs";
import {
  applyAsCandidateAction,
  createCandidateAction,
  updateCandidateAction,
} from "@/lib/actions/candidates";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { Candidate } from "@/lib/prisma/client";
import {
  candidateFormSchema,
  candidateUpdateSchema,
} from "@/lib/schemas/candidate";
import { validateResumeFile } from "@/lib/services/r2-storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Loader2, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FileUpload } from "../ui/file-upload";

type CandidateFormProps =
  | {
      mode: "new";
      positions: { id: string; title: string }[];
      defaultPositionId?: string;
      disabled?: boolean;
      onPositionSelect?: (positionIds: string[]) => void;
    }
  | {
      mode: "apply";
      positions: { id: string; title: string }[];
      defaultPositionId?: string;
      disabled?: boolean;
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
        | "resumeUrl"
        | "doNotContact"
        | "doNotContactNote"
      > & {
        positionIds: string[];
      };
      disabled?: boolean;
      onPositionSelect?: (positionIds: string[]) => void;
    };

export const CandidateForm = (props: CandidateFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeExistingResume, setRemoveExistingResume] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isEditMode = props.mode === "edit";
  const isApplyMode = props.mode === "apply";

  const formatDateForInput = (value?: Date | string | null) => {
    if (!value) {
      return undefined;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Use appropriate schema and type based on mode
  const schema = isEditMode ? candidateUpdateSchema : candidateFormSchema;

  const pathname = usePathname();

  // Reset form when entering the page with current props
  const defaultPositionId =
    !isEditMode && "defaultPositionId" in props
      ? props.defaultPositionId
      : undefined;

  const initialValues = useMemo(
    () =>
      isEditMode
        ? {
            firstName: props.candidate.firstName,
            lastName: props.candidate.lastName,
            email: props.candidate.email,
            dateOfBirth: formatDateForInput(props.candidate.dateOfBirth),
            positionIds: props.candidate.positionIds,
            doNotContact: props.candidate.doNotContact,
            doNotContactNote: props.candidate.doNotContactNote ?? "",
          }
        : {
            firstName: "",
            lastName: "",
            email: "",
            positionIds: defaultPositionId ? [defaultPositionId] : [],
          },
    [defaultPositionId, isEditMode, props],
  );

  const handleCancel = () => {
    router.back();
  };

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  // The note field is shown only while "Non ricontattare" is on
  const doNotContact = useWatch({
    control: form.control,
    name: "doNotContact" as never,
  }) as unknown as boolean | undefined;

  // Reset local file state when the form source changes (adjust during render)
  const [resetKey, setResetKey] = useState({ initialValues, pathname });
  if (
    resetKey.initialValues !== initialValues ||
    resetKey.pathname !== pathname
  ) {
    setResetKey({ initialValues, pathname });
    setSelectedFile(null);
    setRemoveExistingResume(false);
  }

  // Sync react-hook-form (external store) with the latest initial values
  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues, pathname]);

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
          : String(values.dateOfBirth),
      );
    }

    // Handle file upload
    if (selectedFile) {
      formData.append("resumeFile", selectedFile);
    }

    if (isEditMode) {
      const doNotContact = values.doNotContact === true;
      formData.append("doNotContact", doNotContact ? "true" : "false");
      formData.append(
        "doNotContactNote",
        doNotContact && typeof values.doNotContactNote === "string"
          ? values.doNotContactNote
          : "",
      );

      // Flag to remove existing resume
      if (removeExistingResume) {
        formData.append("removeResume", "true");
      }

      startTransition(async () => {
        try {
          unwrap(await updateCandidateAction(props.candidate.id, formData));
          router.push(`/dashboard/candidates/${props.candidate.id}`);
        } catch (submitError: unknown) {
          toast.error(
            errorMessage(
              submitError,
              "Errore durante l'aggiornamento del candidato",
            ),
          );
        }
      });

      return;
    }

    startTransition(async () => {
      try {
        if (isApplyMode) {
          unwrap(await applyAsCandidateAction(formData));
          setIsSubmitted(true);
          return;
        }
        const { candidateId } = unwrap(await createCandidateAction(formData));
        router.push(`/dashboard/candidates/${candidateId}`);
      } catch (submitError: unknown) {
        toast.error(
          errorMessage(submitError, "Errore nella creazione del candidato"),
        );
      }
    });
  };

  // Show success message after apply submission
  if (isApplyMode && isSubmitted) {
    return (
      <div className="py-8 text-center">
        <div className="flex justify-center items-center bg-success/10 mx-auto mb-4 rounded-full w-16 h-16">
          <svg
            className="w-8 h-8 text-success"
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
      className="flex flex-col gap-6"
    >
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Personal Info & Resume */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="size-5 text-primary" />
                Dati Personali
              </CardTitle>
            </CardHeader>
            <CardContent className="gap-6 grid grid-cols-1 md:grid-cols-2">
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
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-primary">📄</span> Curriculum Vitae
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                currentFileUrl={
                  isEditMode && !removeExistingResume
                    ? props.candidate.resumeUrl
                    : undefined
                }
                onFileSelect={handleFileSelect}
                onRemoveExisting={isEditMode ? handleRemoveExisting : undefined}
                isUploading={isPending}
                disabled={isPending}
                validateFile={validateResumeFile}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Position & Status */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card className="top-6 sticky">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="size-5 text-primary" />
                Candidatura
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <MultiSelectField
                control={form.control}
                name="positionIds"
                label="Posizioni"
                required
                disabled={props.disabled}
                placeholder="Seleziona posizioni"
                showClear
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
                <SwitchField
                  control={form.control}
                  name="doNotContact"
                  label="Non ricontattare"
                  disabled={isPending}
                />
              )}

              {isEditMode && doNotContact && (
                <TextareaField
                  control={form.control}
                  name="doNotContactNote"
                  label="Nota"
                  maxLength={500}
                  disabled={isPending}
                />
              )}

              <div className="flex flex-col gap-3 pt-4 border-t">
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {isEditMode
                        ? "Salvataggio..."
                        : isApplyMode
                          ? "Invio..."
                          : "Creazione..."}
                    </>
                  ) : isEditMode ? (
                    "Aggiorna candidato"
                  ) : isApplyMode ? (
                    "Invia candidatura"
                  ) : (
                    "Crea candidato"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="w-full"
                >
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </form>
  );
};
