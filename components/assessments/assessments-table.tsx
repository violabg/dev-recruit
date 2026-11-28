"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableRowLink } from "@/components/ui/table-row-link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ASSESSMENT_STATE_PRESENTATION } from "@/components/assessments/assessment-status";
import { deleteAssessmentAction } from "@/lib/actions/assessments";
import type { AssessmentListItem } from "@/lib/data/assessments";
import {
  assessmentState,
  type AssessmentState,
} from "@/lib/utils/assessment-utils";
import { cn } from "cn";
import {
  CheckCircle,
  Clock,
  Copy,
  MessageSquare,
  MessageSquareText,
  TimerOff,
  XCircle,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useState } from "react";
import { toast } from "sonner";

type AssessmentsTableProps = {
  assessments: AssessmentListItem[];
};

// Icon of each assessment state; labels and tints are shared
const stateIcons: Record<
  AssessmentState,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  pending: Clock,
  in_progress: MessageSquare,
  completed: CheckCircle,
  cancelled: XCircle,
  expired: TimerOff,
};

export function AssessmentsTable({ assessments }: AssessmentsTableProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyAssessmentLink = async (token: string) => {
    const assessmentUrl = `${window.location.origin}/recruiting/${token}`;

    try {
      await navigator.clipboard.writeText(assessmentUrl);
      setCopiedToken(token);
      toast.success("Link copiato negli appunti!");

      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast.error("Errore nel copiare il link");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidato</TableHead>
              <TableHead>Test</TableHead>
              <TableHead>Posizione</TableHead>
              <TableHead>Competenze</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <Empty className="h-[200px]">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <MessageSquareText />
                      </EmptyMedia>
                      <EmptyTitle>Nessun test trovato</EmptyTitle>
                      <EmptyDescription>
                        Prova a modificare i filtri di ricerca.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              assessments.map((assessment) => {
                const state = assessmentState({
                  status: assessment.status,
                  startedAt: assessment.startedAt,
                  timeLimit: assessment.quizTimeLimit,
                });
                const info = ASSESSMENT_STATE_PRESENTATION[state];
                const StateIcon = stateIcons[state];

                return (
                  <TableRow key={assessment.id} className="group">
                    <TableCell className="relative font-medium">
                      <TableRowLink
                        href={`/dashboard/assessments/${assessment.id}`}
                      />
                      {assessment.candidateName || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {assessment.quizTitle || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {assessment.positionTitle || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {assessment.positionSkills.slice(0, 3).map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {assessment.positionSkills.length > 3 && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs">
                                  +{assessment.positionSkills.length - 3}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="flex flex-col gap-1">
                                  {assessment.positionSkills
                                    .slice(3)
                                    .map((skill) => (
                                      <div key={skill}>{skill}</div>
                                    )) || []}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "flex items-center gap-1 w-fit",
                          info.badge,
                        )}
                      >
                        <StateIcon className="size-3" />
                        {info.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="z-10 relative text-right">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() =>
                                  copyAssessmentLink(assessment.token)
                                }
                                className={
                                  copiedToken === assessment.token
                                    ? "bg-success/10 border-success/30"
                                    : ""
                                }
                              />
                            }
                          >
                            <Copy className="size-4" />
                          </TooltipTrigger>
                          <TooltipContent>
                            {copiedToken === assessment.token
                              ? "Copiato!"
                              : "Copia link test"}
                          </TooltipContent>
                        </Tooltip>
                      <DeleteWithConfirm
                        deleteAction={() => deleteAssessmentAction(assessment.id)}
                        title="Eliminare il test?"
                        description="Questa azione eliminerà permanentemente il test e tutte le risposte associate. L'azione non può essere annullata."
                        label="Elimina"
                        iconOnly
                        successMessage="Test eliminato con successo"
                        errorMessage="Errore durante l'eliminazione del test"
                        disabled={assessment.status === "completed"}
                        variant="outline"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
