"use client";

import { Button } from "@/components/ui/button";
import { MultiSelectField } from "@/components/ui/rhf-inputs";
import { assignQuizzesToCandidateAction } from "@/lib/actions/assessments";
import { QuizSelection, quizSelectionSchema } from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type CreatedLink = { quizId: string; token: string; quizTitle: string };

/**
 * Sends one or more quizzes of the position to the candidate. The most
 * recent quiz not yet sent is preselected. Sending moves the application to
 * the Test stage.
 */
export function SendAssessmentForm({
  candidateId,
  availableQuizzes,
  primaryAction = false,
}: {
  candidateId: string;
  /** Quizzes of the position not yet sent, newest first */
  availableQuizzes: { id: string; title: string; timeLimit: number | null }[];
  /** True when sending is the page's next step: its button is the primary one */
  primaryAction?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createdLinks, setCreatedLinks] = useState<CreatedLink[]>([]);

  const form = useForm<QuizSelection>({
    resolver: zodResolver(quizSelectionSchema),
    defaultValues: {
      quizIds: availableQuizzes[0] ? [availableQuizzes[0].id] : [],
    },
  });

  const onSubmit = (values: QuizSelection) => {
    startTransition(async () => {
      try {
        const result = unwrap(
          await assignQuizzesToCandidateAction({
            candidateId,
            quizIds: values.quizIds,
          }),
        );

        setCreatedLinks(result.created);

        if (result.created.length > 0) {
          toast.success("Link del test creati");
        }

        if (result.skipped.length > 0) {
          toast.warning("Alcuni test non sono stati creati", {
            description: result.skipped.join(" "),
          });
        }

        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/recruiting/${token}`);
    toast.success("Link copiato");
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <MultiSelectField
          control={form.control}
          name="quizIds"
          label="Test"
          required
          options={availableQuizzes.map((quiz) => ({
            value: quiz.id,
            label: `${quiz.title}${quiz.timeLimit ? ` (${quiz.timeLimit} min)` : ""}`,
          }))}
          placeholder="Seleziona i test da inviare"
          showClear
        />
        <Button
          type="submit"
          size="sm"
          variant={primaryAction ? "default" : "outline"}
          disabled={isPending}
          className="w-fit"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Invia test
        </Button>
      </form>

      {createdLinks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium text-sm">Link del test generati</h3>
          {createdLinks.map((link) => (
            <div
              key={link.quizId}
              className="flex justify-between items-center gap-3 bg-muted/50 p-3 border rounded-lg"
            >
              <span className="font-medium text-sm">{link.quizTitle}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyLink(link.token)}
              >
                <Copy className="size-4" />
                Copia link
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
