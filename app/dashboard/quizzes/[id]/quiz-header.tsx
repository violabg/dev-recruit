import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllPositions } from "@/lib/data/positions";
import { getQuizById } from "@/lib/data/quizzes";
import { formatDate } from "@/lib/utils";
import { Clock } from "lucide-react";
import Link from "next/link";
import { QuizDetailActionsClient } from "./quiz-detail-actions-client";

type Props = {
  params: Promise<{ id: string }>;
};

export async function QuizHeader({ params }: Props) {
  const { id } = await params;
  const quiz = await getQuizById(id);

  if (!quiz) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Quiz non trovato</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/quizzes">Torna ai quiz</Link>
        </Button>
      </div>
    );
  }

  const position = quiz.position;

  if (!position) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Posizione non trovata</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/quizzes">Torna ai quiz</Link>
        </Button>
      </div>
    );
  }

  // Fetch all positions for duplicate dialog
  const allPositions = await getAllPositions();
  const positionsForDialog = allPositions.map((pos) => ({
    id: pos.id,
    title: pos.title,
  }));

  return (
    <PageHeader
      title={quiz.title}
      info={
        <>
          <Badge variant="outline">{position.title}</Badge>
          <Badge variant="outline">{position.experienceLevel}</Badge>
          {quiz.timeLimit && (
            <Badge variant="secondary">
              <Clock className="mr-1 w-3 h-3" />
              {quiz.timeLimit} minuti
            </Badge>
          )}
          <span className="text-muted-foreground text-sm">
            Creato il {formatDate(quiz.createdAt)}
          </span>
        </>
      }
      actionBtns={
        <QuizDetailActionsClient
          quizId={quiz.id}
          quizTitle={quiz.title}
          positions={positionsForDialog}
        />
      }
    />
  );
}
