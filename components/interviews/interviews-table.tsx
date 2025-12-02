"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { InterviewListItem } from "@/lib/data/interviews";
import {
  CheckCircle,
  Clock,
  Copy,
  MessageSquare,
  MessageSquareText,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type InterviewsTableProps = {
  interviews: InterviewListItem[];
};

// Status configuration for badges and icons
const statusConfig = {
  pending: {
    label: "Pendente",
    icon: Clock,
    variant: "secondary" as const,
    color: "text-orange-500",
  },
  in_progress: {
    label: "In Corso",
    icon: MessageSquare,
    variant: "default" as const,
    color: "text-blue-500",
  },
  completed: {
    label: "Completato",
    icon: CheckCircle,
    variant: "default" as const,
    color: "text-green-500",
  },
  cancelled: {
    label: "Annullato",
    icon: XCircle,
    variant: "destructive" as const,
    color: "text-red-500",
  },
};

export function InterviewsTable({ interviews }: InterviewsTableProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyInterviewLink = async (token: string) => {
    const interviewUrl = `${window.location.origin}/recruting/${token}`;

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
    <div className="space-y-4">
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
                const statusInfo =
                  statusConfig[interview.status as keyof typeof statusConfig];
                const StatusIcon = statusInfo?.icon || Clock;

                return (
                  <TableRow key={interview.id} className="group relative">
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/interviews/${interview.id}`}
                        className="absolute inset-0"
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs">
                                  +{interview.positionSkills.length - 3}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  {interview.positionSkills
                                    .slice(3)
                                    .map((skill) => (
                                      <div key={skill}>{skill}</div>
                                    )) || []}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusInfo?.variant || "secondary"}
                        className="flex items-center gap-1 w-fit"
                      >
                        <StatusIcon className="size-3" />
                        {statusInfo?.label || interview.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="z-10 relative text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => copyInterviewLink(interview.token)}
                              className={
                                copiedToken === interview.token
                                  ? "bg-green-50 border-green-200"
                                  : ""
                              }
                            >
                              <Copy className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {copiedToken === interview.token
                              ? "Copiato!"
                              : "Copia link colloquio"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
