"use client";
import { DuplicateQuizDialog } from "@/components/quiz/duplicate-quiz-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteQuiz } from "@/lib/actions/quizzes";
import { Copy, Edit, Send, Trash } from "lucide-react";
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
        <Button variant="outline" asChild>
          <Link href={`/dashboard/quizzes/${quizId}/edit`}>
            <Edit className="mr-2 w-4 h-4" />
            Modifica
          </Link>
        </Button>
        <Button variant="default" asChild>
          <Link href={`/dashboard/quizzes/${quizId}/invite`}>
            <Send className="mr-2 w-4 h-4" />
            Assicia a candidati
          </Link>
        </Button>
        <Button
          variant="secondary"
          onClick={() => setIsDuplicateDialogOpen(true)}
        >
          <Copy className="mr-2 w-4 h-4" />
          Duplica
        </Button>
        {/* Delete button uses server action */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash className="mr-2 w-4 h-4" />
              Elimina
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione non può essere annullata. Il quiz verrà eliminato
                permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <form action={deleteQuiz}>
                <input type="hidden" name="quiz_id" value={quizId} />
                <AlertDialogAction
                  type="submit"
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Elimina
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
