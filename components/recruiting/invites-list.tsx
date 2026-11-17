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
import { ASSESSMENT_STATE_PRESENTATION } from "@/components/assessments/assessment-status";
import { deleteAssessmentAction } from "@/lib/actions/assessments";
import type { AssignedAssessment } from "@/lib/data/assessments";
import {
  assessmentState,
  type AssessmentState,
} from "@/lib/utils/assessment-utils";
import { cn } from "cn";
import { toast } from "sonner";
import { TableRowLink } from "../ui/table-row-link";

interface InvitesListProps {
  assignedAssessments: AssignedAssessment[];
}

export function InvitesList({ assignedAssessments }: InvitesListProps) {
  const [assessments, setAssessments] =
    useState<AssignedAssessment[]>(assignedAssessments);

  const copyAssessmentLink = (token: string) => {
    const link = `${window.location.origin}/recruiting/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiato", {
      description: "Il link del test è stato copiato negli appunti",
    });
  };

  const statusBadge = (state: AssessmentState) => {
    const { label, badge } = ASSESSMENT_STATE_PRESENTATION[state];
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

  if (assessments.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center p-8 border border-dashed rounded-lg h-40 text-center">
        <p className="text-muted-foreground text-sm">
          Non è ancora stato creato nessun test.
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
            {assessments.map((assessment) => (
              <TableRow key={assessment.id}>
                <TableCell className="relative font-medium">
                  <TableRowLink
                    href={`/dashboard/assessments/${assessment.id}`}
                  />
                  {assessment.candidateName}
                </TableCell>
                <TableCell>{assessment.quizTitle}</TableCell>
                <TableCell>
                  {statusBadge(
                    assessmentState({
                      status: assessment.status,
                      startedAt: assessment.startedAt,
                      timeLimit: assessment.quizTimeLimit,
                    }),
                  )}
                </TableCell>
                <TableCell>{formatDate(assessment.createdAt)}</TableCell>
                <TableCell className="z-10 relative text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyAssessmentLink(assessment.token)}
                      title="Copia il link del test"
                    >
                      <Copy className="size-4" />
                    </Button>
                    <DeleteWithConfirm
                      deleteAction={async () => {
                        const result = await deleteAssessmentAction(
                          assessment.id,
                        );
                        if (result.success) {
                          setAssessments(
                            assessments.filter((a) => a.id !== assessment.id),
                          );
                        }
                        return result;
                      }}
                      title="Eliminare il test?"
                      description="Il test verrà eliminato definitivamente. L'azione non può essere annullata."
                      label="Elimina"
                      iconOnly
                      successMessage="Test eliminato con successo"
                      errorMessage="Errore durante l'eliminazione del test"
                      disabled={assessment.status === "completed"}
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
