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
import { deleteInterview } from "@/lib/actions/interviews";
import type { AssignedInterview } from "@/lib/data/interviews";
import { toast } from "sonner";
import { TableRowLink } from "../ui/table-row-link";

interface InvitesListProps {
  assignedInterviews: AssignedInterview[];
}

export function InvitesList({ assignedInterviews }: InvitesListProps) {
  const [interviews, setInterviews] =
    useState<AssignedInterview[]>(assignedInterviews);

  const copyInterviewLink = (token: string) => {
    const link = `${window.location.origin}/recruting/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiato", {
      description: "Il link del colloquio è stato copiato negli appunti",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">In attesa</Badge>;
      case "in_progress":
        return <Badge variant="secondary">In corso</Badge>;
      case "completed":
        return <Badge>Completato</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Annullato</Badge>;
      case "expired":
        return <Badge variant="destructive">Scaduto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
                <TableCell>{getStatusBadge(interview.status)}</TableCell>
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
                        const result = await deleteInterview(interview.id);
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
