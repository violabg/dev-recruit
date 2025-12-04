"use client";

import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { EntityActionsMenu } from "@/components/ui/entity-actions-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableRowLink } from "@/components/ui/table-row-link";
import { deleteQuizById } from "@/lib/actions/quizzes";
import { Quiz } from "@/lib/data/quizzes";
import { formatDate } from "@/lib/utils";
import { ArrowUpDown, Clock, Link2 } from "lucide-react";
import Link from "next/link";

interface QuizTableProps {
  quizzes: Quiz[];
}

export function QuizTable({ quizzes }: QuizTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">
              <div className="flex items-center">
                Titolo
                <ArrowUpDown className="ml-2 size-4" />
              </div>
            </TableHead>
            <TableHead>Posizione</TableHead>
            <TableHead>Domande</TableHead>
            <TableHead>Tempo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quizzes.map((quiz) => (
            <TableRow key={quiz.id} className="group">
              <TableCell className="relative font-medium">
                <TableRowLink href={`/dashboard/quizzes/${quiz.id}`} />
                {quiz.title}
              </TableCell>
              <TableCell>
                {quiz.positions ? (
                  <div className="flex flex-col gap-1">
                    <span>{quiz.positions.title}</span>
                    {quiz.positions.experienceLevel && (
                      <Badge variant="outline" className="w-fit text-xs">
                        {quiz.positions.experienceLevel}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    Nessuna posizione
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">
                  {quiz.questions.length} domande
                </span>
              </TableCell>
              <TableCell>
                {quiz.timeLimit ? (
                  <Badge variant="secondary">
                    <Clock className="mr-1 w-3 h-3" />
                    {quiz.timeLimit} min
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>{formatDate(quiz.createdAt)}</TableCell>
              <TableCell className="z-10 relative text-right">
                <EntityActionsMenu
                  entityId={quiz.id}
                  editHref={`/dashboard/quizzes/${quiz.id}/edit`}
                  deleteAction={deleteQuizById.bind(null, quiz.id)}
                  deleteTitle="Elimina quiz"
                  deleteDescription="Sei sicuro di voler eliminare questo quiz? Questa azione non può essere annullata."
                  deleteErrorMessage="Errore durante l'eliminazione del quiz"
                >
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/quizzes/${quiz.id}/invite`}>
                      <Link2 className="mr-1 size-4" />
                      Associa candidato
                    </Link>
                  </DropdownMenuItem>
                </EntityActionsMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
