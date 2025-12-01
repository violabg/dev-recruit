"use client";
import { DuplicateQuizDialog } from "@/components/quiz/duplicate-quiz-dialog";
import { Button } from "@/components/ui/button";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { deleteQuizById } from "@/lib/actions/quizzes";
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
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/quizzes/${quizId}/edit`}>
            <Edit className="mr-1 size-4" />
            Modifica
          </Link>
        </Button>
        <Button variant="default" size="sm" asChild>
          <Link href={`/dashboard/quizzes/${quizId}/invite`}>
            <Send className="mr-1 size-4" />
            Assicia a candidati
          </Link>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsDuplicateDialogOpen(true)}
        >
          <Copy className="mr-1 size-4" />
          Duplica
        </Button>
        <DeleteWithConfirm
          deleteAction={deleteQuizById.bind(null, quizId)}
          description="Questa azione non può essere annullata. Il quiz verrà eliminato permanentemente."
          errorMessage="Errore durante l'eliminazione del quiz"
        />
      </div>

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
