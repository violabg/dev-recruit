"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EntityActionsMenu } from "@/components/ui/entity-actions-menu";
import { deleteQuizById } from "@/lib/actions/quizzes";
import { Quiz } from "@/lib/data/quizzes";
import { formatDate } from "@/lib/utils";
import { Clock, Eye, Link2 } from "lucide-react";
import Link from "next/link";

type Props = {
  quiz: Quiz;
};

export function QuizCard({
  quiz: { id, title, positions, timeLimit, questions, createdAt },
}: Props) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-1">{title}</CardTitle>
          <EntityActionsMenu
            entityId={id}
            editHref={`/dashboard/quizzes/${id}/edit`}
            deleteAction={deleteQuizById.bind(null, id)}
            deleteTitle="Elimina quiz"
            deleteDescription="Sei sicuro di voler eliminare questo quiz? Questa azione non può essere annullata."
            deleteErrorMessage="Errore durante l'eliminazione del quiz"
          />
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {positions && <Badge variant="outline">{positions?.title}</Badge>}
            {positions && (
              <Badge variant="outline">{positions.experienceLevel}</Badge>
            )}
            {timeLimit && (
              <Badge variant="secondary">
                <Clock className="mr-1 w-3 h-3" />
                {timeLimit} minuti
              </Badge>
            )}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {questions.length} domande
            </span>
            <span className="text-muted-foreground">
              {formatDate(createdAt)}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="mt-auto pt-2">
        <div className="flex justify-between gap-2 w-full">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/quizzes/${id}`}>
              <Eye className="mr-1 w-4 h-4 text-primary" />
              Visualizza
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/dashboard/quizzes/${id}/invite`}>
              <Link2 className="mr-1 w-4 h-4" />
              Associa candidato
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
