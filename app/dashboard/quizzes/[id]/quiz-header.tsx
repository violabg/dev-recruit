import { cn } from "cn";
import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SECTIONS } from "@/components/dashboard/sections";

import { getAllPositions } from "@/lib/data/positions";
import { getQuizById } from "@/lib/data/quizzes";
import { formatDate } from "@/lib/utils";
import { sectionTrail } from "@/lib/utils/breadcrumbs";
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
        <p className="font-medium text-lg">Test non trovato</p>
        <Link
          href="/dashboard/quizzes"
          className={cn("mt-4", buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Vai ai test
        </Link>
      </div>
    );
  }

  const position = quiz.position;

  if (!position) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Posizione non trovata</p>
        <Link
          href="/dashboard/quizzes"
          className={cn("mt-4", buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Vai ai test
        </Link>
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
      breadcrumbs={sectionTrail(SECTIONS.quizzes, { label: quiz.title })}
      info={
        <>
          <Badge variant="outline">{position.title}</Badge>
          <span className="text-muted-foreground text-sm">
            {position.experienceLevel}
          </span>
          {quiz.timeLimit && (
            <span className="inline-flex items-center text-muted-foreground text-sm">
              <Clock className="mr-1 w-3 h-3" />
              {quiz.timeLimit} minuti
            </span>
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
