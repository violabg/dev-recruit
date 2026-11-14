"use client";

import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Copy } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { INTERVIEW_STATE_PRESENTATION } from "@/components/interviews/interview-status";
import { deleteInterviewAction } from "@/lib/actions/interviews";
import type { AssignedInterview } from "@/lib/data/interviews";
import { interviewState, type InterviewState } from "@/lib/utils/interview-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TableRowLink } from "../ui/table-row-link";

interface InvitesListProps {
  assignedInterviews: AssignedInterview[];
}

export function InvitesList({ assignedInterviews }: InvitesListProps) {
  const [interviews, setInterviews] =
    useState<AssignedInterview[]>(assignedInterviews);

  const copyInterviewLink = (token: string) => {
    const link = `${window.location.origin}/recruiting/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiato", {
      description: "Il link del colloquio è stato copiato negli appunti",
    });
  };

  const statusBadge = (state: InterviewState) => {
    const { label, badge } = INTERVIEW_STATE_PRESENTATION[state];
    return <Badge className={cn("w-fit", badge)}>{label}</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: it,
      });
    } catch {
      return dateString;
    }
  };

  if (interviews.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center p-8 border border-dashed rounded-lg h-40 text-center">
        <p className="text-muted-foreground text-sm">
          Non è ancora stato creato nessun colloquio.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidato</TableHead>
              <TableHead>Quiz</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Creato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interviews.map((interview) => (
              <TableRow key={interview.id}>
                <TableCell className="relative font-medium">
                  <TableRowLink
                    href={`/dashboard/interviews/${interview.id}`}
                  />
                  {interview.candidateName}
                </TableCell>
                <TableCell>{interview.quizTitle}</TableCell>
                <TableCell>
                  {statusBadge(
                    interviewState({
                      status: interview.status,
                      startedAt: interview.startedAt,
                      timeLimit: interview.quizTimeLimit,
                    }),
                  )}
                </TableCell>
                <TableCell>{formatDate(interview.createdAt)}</TableCell>
                <TableCell className="z-10 relative text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInterviewLink(interview.token)}
                      title="Copia il link del colloquio"
                    >
                      <Copy className="size-4" />
                    </Button>
                    <DeleteWithConfirm
                      deleteAction={async () => {
                        const result = await deleteInterviewAction(interview.id);
                        if (result.success) {
                          setInterviews(
                            interviews.filter((i) => i.id !== interview.id),
                          );
                        }
                        return result;
                      }}
                      title="Eliminare il colloquio?"
                      description="Il colloquio verrà eliminato definitivamente. L'azione non può essere annullata."
                      label="Elimina"
                      iconOnly
                      successMessage="Colloquio eliminato con successo"
                      errorMessage="Errore durante l'eliminazione del colloquio"
                      disabled={interview.status === "completed"}
                      variant="outline"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
