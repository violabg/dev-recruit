"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { errorMessage, unwrap } from "@/lib/utils/action-result";

import { Button } from "@/components/ui/button";
import { MultiSelectField } from "@/components/ui/rhf-inputs";
import { assignQuizzesToCandidate } from "@/lib/actions/interviews";
import { QuizSelection, quizSelectionSchema } from "@/lib/schemas";

interface Quiz {
  id: string;
  title: string;
  createdAt: string;
  timeLimit: number | null;
}

interface QuizSelectionFormProps {
  candidateId: string;
  availableQuizzes: Quiz[];
  onSuccess?: () => void;
}

type CreatedLink = Extract<
  Awaited<ReturnType<typeof assignQuizzesToCandidate>>,
  { success: true }
>["created"][number];

export function QuizSelectionForm({
  candidateId,
  availableQuizzes,
  onSuccess,
}: QuizSelectionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [createdLinks, setCreatedLinks] = useState<CreatedLink[]>([]);

  const form = useForm<QuizSelection>({
    resolver: zodResolver(quizSelectionSchema),
    defaultValues: { quizIds: [] },
  });

  const onSubmit = (values: QuizSelection) => {
    startTransition(async () => {
      try {
        const result = unwrap(
          await assignQuizzesToCandidate({
          candidateId,
          quizIds: values.quizIds,
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

  const quizOptions = availableQuizzes.map((quiz) => ({
    label: `${quiz.title}${quiz.timeLimit ? ` (${quiz.timeLimit} min)` : ""}`,
    value: quiz.id,
  }));

  return (
    <div className="space-y-6">
      {availableQuizzes.length === 0 ? (
        <div className="flex flex-col justify-center items-center p-8 border border-dashed rounded-lg h-40 text-center">
          <p className="text-muted-foreground text-sm">
            Nessun quiz disponibile per la posizione di questo candidato.
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Crea prima un quiz per questa posizione, poi assegnalo ai
            candidati.
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
            name="quizIds"
            label="Seleziona i quiz"
            required
            options={quizOptions}
            placeholder="Seleziona i quiz da assegnare a questo candidato"
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
                key={link.quizId}
                className="flex justify-between items-center bg-muted/50 p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{link.quizTitle}</div>
                  <div className="text-muted-foreground text-sm">
                    Link del colloquio pronto
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
