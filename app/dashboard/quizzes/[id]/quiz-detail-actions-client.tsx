"use client";
import { DuplicateQuizDialog } from "@/components/quiz/duplicate-quiz-dialog";
import { Button, buttonVariants } from "@/components/ui/button";

import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { deleteQuizAction } from "@/lib/actions/quizzes";
import { Copy, Edit, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type QuizDetailActionsClientProps = {
  quizId: string;
  quizTitle: string;
  positions: Array<{
    id: string;
    title: string;
  }>;
};

export function QuizDetailActionsClient({
  quizId,
  quizTitle,
  positions,
}: QuizDetailActionsClientProps) {
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);

  return (
    <>
      <Link
        href={`/dashboard/quizzes/${quizId}/invite`}
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        <Send className="mr-1 size-4" />
        Associa a candidati
      </Link>
      <Link
        href={`/dashboard/quizzes/${quizId}/edit`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Edit className="mr-1 size-4" />
        Modifica
      </Link>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDuplicateDialogOpen(true)}
      >
        <Copy className="mr-1 size-4" />
        Duplica
      </Button>

      <DeleteWithConfirm
        deleteAction={deleteQuizAction.bind(null, quizId)}
        description="Questa azione non può essere annullata. Il test verrà eliminato permanentemente."
        errorMessage="Errore durante l'eliminazione del test"
      />

      <DuplicateQuizDialog
        open={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
        quizId={quizId}
        quizTitle={quizTitle}
        positions={positions}
      />
    </>
  );
}
