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
import { deleteInterviewAction } from "@/lib/actions/interviews";
import type { InterviewListItem } from "@/lib/data/interviews";
import { interviewState, type InterviewState } from "@/lib/utils/interview-utils";
import { cn } from "@/lib/utils";
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

type InterviewsTableProps = {
  interviews: InterviewListItem[];
};

// Status configuration for badges and icons
const statusConfig: Record<
  InterviewState,
  {
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    badge: string;
  }
> = {
  pending: {
    label: "In attesa",
    icon: Clock,
    badge: "bg-stage-pending/10 text-stage-pending",
  },
  in_progress: {
    label: "In corso",
    icon: MessageSquare,
    badge: "bg-stage-progress/10 text-stage-progress",
  },
  completed: {
    label: "Completato",
    icon: CheckCircle,
    badge: "bg-stage-done/10 text-stage-done",
  },
  cancelled: {
    label: "Annullato",
    icon: XCircle,
    badge: "bg-stage-cancelled/10 text-stage-cancelled",
  },
  expired: {
    label: "Scaduto",
    icon: TimerOff,
    badge: "bg-stage-expired/10 text-stage-expired",
  },
};

export function InterviewsTable({ interviews }: InterviewsTableProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyInterviewLink = async (token: string) => {
    const interviewUrl = `${window.location.origin}/recruiting/${token}`;

    try {
      await navigator.clipboard.writeText(interviewUrl);
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
              <TableHead>Quiz</TableHead>
              <TableHead>Posizione</TableHead>
              <TableHead>Competenze</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <Empty className="h-[200px]">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <MessageSquareText />
                      </EmptyMedia>
                      <EmptyTitle>Nessun colloquio trovato</EmptyTitle>
                      <EmptyDescription>
                        Prova a modificare i filtri di ricerca.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              interviews.map((interview) => {
                const state = interviewState({
                  status: interview.status,
                  startedAt: interview.startedAt,
                  timeLimit: interview.quizTimeLimit,
                });
                const info = statusConfig[state];

                return (
                  <TableRow key={interview.id} className="group">
                    <TableCell className="relative font-medium">
                      <TableRowLink
                        href={`/dashboard/interviews/${interview.id}`}
                      />
                      {interview.candidateName || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {interview.quizTitle || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {interview.positionTitle || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {interview.positionSkills.slice(0, 3).map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {interview.positionSkills.length > 3 && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs">
                                  +{interview.positionSkills.length - 3}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="flex flex-col gap-1">
                                  {interview.positionSkills
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
                        <info.icon className="size-3" />
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
                                  copyInterviewLink(interview.token)
                                }
                                className={
                                  copiedToken === interview.token
                                    ? "bg-success/10 border-success/30"
                                    : ""
                                }
                              />
                            }
                          >
                            <Copy className="size-4" />
                          </TooltipTrigger>
                          <TooltipContent>
                            {copiedToken === interview.token
                              ? "Copiato!"
                              : "Copia link colloquio"}
                          </TooltipContent>
                        </Tooltip>
                      <DeleteWithConfirm
                        deleteAction={() => deleteInterviewAction(interview.id)}
                        title="Eliminare il colloquio?"
                        description="Questa azione eliminerà permanentemente il colloquio e tutte le risposte associate. L'azione non può essere annullata."
                        label="Elimina"
                        iconOnly
                        successMessage="Colloquio eliminato con successo"
                        errorMessage="Errore durante l'eliminazione del colloquio"
                        disabled={interview.status === "completed"}
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
