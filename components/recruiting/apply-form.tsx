"use client";

import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { InputField } from "@/components/ui/rhf-inputs";
import { applyAsCandidateAction } from "@/lib/actions/candidates";
import { candidateFormSchema } from "@/lib/schemas/candidate";
import { validateResumeFile } from "@/lib/services/r2-storage";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const applySchema = candidateFormSchema.omit({ positionIds: true });

type ApplyFormProps = {
  /** The positions the visitor applies to; chosen outside the form */
  positionIds: string[];
  /** Top of the panel: the chosen positions. Hidden once sent. */
  header: ReactNode;
};

/**
 * Personal data, CV and submit of a public application. The positions come
 * from the page; the server accepts only open ones.
 */
export function ApplyForm({ positionIds, header }: ApplyFormProps) {
  const [isPending, startTransition] = useTransition();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSent, setIsSent] = useState(false);

  const form = useForm({
    resolver: zodResolver(applySchema),
    defaultValues: { firstName: "", lastName: "", email: "" },
  });

  const submit = form.handleSubmit((values) => {
    const formData = new FormData();
    formData.append("firstName", values.firstName);
    formData.append("lastName", values.lastName);
    formData.append("email", values.email);
    formData.append("positionIds", JSON.stringify(positionIds));
    if (values.dateOfBirth) {
      const dateOfBirth: unknown = values.dateOfBirth;
      formData.append(
        "dateOfBirth",
        dateOfBirth instanceof Date
          ? dateOfBirth.toISOString()
          : String(dateOfBirth),
      );
    }
    if (resumeFile) {
      formData.append("resumeFile", resumeFile);
    }

    startTransition(async () => {
      try {
        unwrap(await applyAsCandidateAction(formData));
        setIsSent(true);
      } catch (error: unknown) {
        toast.error(errorMessage(error, "Invio della candidatura non riuscito"));
      }
    });
  });

  if (isSent) {
    return (
      <div role="status" className="flex flex-col items-center py-8 text-center">
        <CheckCircle2 aria-hidden className="mb-4 size-12 text-success" />
        <h2 className="font-display font-bold text-heading text-xl">
          Candidatura inviata
        </h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          Grazie. Valutiamo il tuo profilo e ti rispondiamo via email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col" noValidate>
      {header}

      <fieldset className="mt-6 pt-6 border-t" disabled={isPending}>
        <legend className="float-left mb-4 w-full font-display font-bold text-heading text-base">
          I tuoi dati
        </legend>
        <div className="clear-both gap-4 grid grid-cols-1 sm:grid-cols-2">
          <InputField
            control={form.control}
            name="firstName"
            label="Nome"
            required
            autoComplete="given-name"
          />
          <InputField
            control={form.control}
            name="lastName"
            label="Cognome"
            required
            autoComplete="family-name"
          />
          <InputField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
          />
          <InputField
            control={form.control}
            name="dateOfBirth"
            label="Data di nascita"
            type="date"
            autoComplete="bday"
            className="w-full"
          />
        </div>
      </fieldset>

      <div className="mt-6 pt-6 border-t">
        <h3 className="mb-4 font-display font-bold text-heading text-base">
          Curriculum
        </h3>
        <FileUpload
          onFileSelect={setResumeFile}
          isUploading={isPending}
          disabled={isPending}
          validateFile={validateResumeFile}
        />
      </div>

      <Button type="submit" size="lg" className="mt-6 w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            Invio in corso
          </>
        ) : (
          "Invia candidatura"
        )}
      </Button>
    </form>
  );
}
