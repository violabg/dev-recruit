"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { InterviewListItem } from "@/lib/types/interview";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  MessageSquare,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type InterviewsTableProps = {
  interviews: InterviewListItem[];
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
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

export function InterviewsTable({
  interviews,
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
}: InterviewsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyInterviewLink = async (token: string) => {
    const interviewUrl = `${window.location.origin}/interview/${token}`;

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

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/dashboard/interviews?${params.toString()}`);
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
                <TableCell
                  colSpan={11}
                  className="h-24 text-muted-foreground text-center"
                >
                  Nessun colloquio trovato
                </TableCell>
              </TableRow>
            ) : (
              interviews.map((interview) => {
                const statusInfo =
                  statusConfig[interview.status as keyof typeof statusConfig];
                const StatusIcon = statusInfo?.icon || Clock;

                return (
                  <TableRow key={interview.id}>
                    <TableCell className="font-medium">
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
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  copyInterviewLink(interview.token)
                                }
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

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" asChild>
                                <Link
                                  href={`/dashboard/interviews/${interview.id}`}
                                >
                                  <ExternalLink className="size-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Apri colloquio in nuova scheda
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-muted-foreground text-sm">
            Pagina {currentPage} di {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToPage(currentPage - 1)}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="size-4" />
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToPage(currentPage + 1)}
              disabled={!hasNextPage}
            >
              Successiva
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
