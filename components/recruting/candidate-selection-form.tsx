"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { errorMessage, unwrap } from "@/lib/utils/action-result";

import { Button } from "@/components/ui/button";
import { MultiSelectField } from "@/components/ui/rhf-inputs";
import { assignCandidatesToQuiz } from "@/lib/actions/interviews";
import { CandidateSelection, candidateSelectionSchema } from "@/lib/schemas";

interface Candidate {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface CandidateSelectionFormProps {
  quizId: string;
  unassignedCandidates: Candidate[];
  onSuccess?: () => void;
}

type CreatedLink = Extract<
  Awaited<ReturnType<typeof assignCandidatesToQuiz>>,
  { success: true }
>["created"][number];

export function CandidateSelectionForm({
  quizId,
  unassignedCandidates,
  onSuccess,
}: CandidateSelectionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [createdLinks, setCreatedLinks] = useState<CreatedLink[]>([]);

  const form = useForm<CandidateSelection>({
    resolver: zodResolver(candidateSelectionSchema),
    defaultValues: { candidateIds: [] },
  });

  const onSubmit = (values: CandidateSelection) => {
    startTransition(async () => {
      try {
        const result = unwrap(
          await assignCandidatesToQuiz({
          quizId,
          candidateIds: values.candidateIds,
          }),
        );

        setCreatedLinks(result.created);

        if (result.created.length > 0) {
          toast.success("Link di colloquio creati", {
            description: `${result.created.length} link creati con successo`,
          });
          form.reset();
          onSuccess?.();
        }

        if (result.skipped.length > 0) {
          toast.warning("Alcuni colloqui non sono stati creati", {
            description: result.skipped.join(" "),
          });
        }
      } catch (error) {
        toast.error("Errore nella creazione dei colloqui", {
          description: errorMessage(error),
        });
      }
    });
  };

  const copyInterviewLink = (token: string) => {
    const link = `${window.location.origin}/recruting/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiato", {
      description: "Il link del colloquio è stato copiato negli appunti",
    });
  };

  const candidateOptions = unassignedCandidates.map((candidate) => ({
    label: `${candidate.name} (${candidate.email})`,
    value: candidate.id,
  }));

  return (
    <div className="space-y-6">
      {unassignedCandidates.length === 0 ? (
        <div className="flex flex-col justify-center items-center p-8 border border-dashed rounded-lg h-40 text-center">
          <p className="text-muted-foreground text-sm">
            Nessun candidato da assegnare per la posizione di questo quiz.
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Tutti i candidati di questa posizione sono già stati assegnati,
            oppure la posizione non ha candidati.
          </p>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <MultiSelectField
            control={form.control}
            name="candidateIds"
            label="Seleziona i candidati"
            required
            options={candidateOptions}
            placeholder="Seleziona i candidati a cui assegnare questo quiz"
            showClear
          />

          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creazione colloqui...
              </>
            ) : (
              <>
                <Plus className="mr-1 size-4" />
                Crea link di colloquio
              </>
            )}
          </Button>
        </form>
      )}

      {createdLinks.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Link di colloquio generati</h3>
          <div className="space-y-2">
            {createdLinks.map((link) => (
              <div
                key={link.candidateId}
                className="flex justify-between items-center bg-muted/50 p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{link.candidateName}</div>
                  <div className="text-muted-foreground text-sm">
                    {link.candidateEmail} • Link del colloquio pronto
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyInterviewLink(link.token)}
                >
                  <Copy className="mr-1 size-4" />
                  Copia link
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
