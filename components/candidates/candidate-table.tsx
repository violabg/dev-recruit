"use client";
import { ApplicationStageBadge } from "@/components/applications/application-stage-badge";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableRowLink } from "@/components/ui/table-row-link";
import { deleteCandidateAction } from "@/lib/actions/candidates";
import { CandidateWithRelations } from "@/lib/data/candidates";
import { furthestApplication } from "@/lib/utils/application-stage";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowUpDown, FileText, Link2 } from "lucide-react";
import Link from "next/link";
import { EntityActionsMenu } from "../ui/entity-actions-menu";

// Props for the candidate table
interface CandidateTableProps {
  candidates: CandidateWithRelations[];
}

// Get full name from firstName and lastName
function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

// Candidate table component
export function CandidateTable({ candidates }: CandidateTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">
              <div className="flex items-center">
                Nome
                <ArrowUpDown className="ml-2 size-4" />
              </div>
            </TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Posizione</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => {
            const activeApplications = candidate.applications.filter(
              (application) => application.stage !== "withdrawn",
            );
            const furthest = furthestApplication(candidate.applications);

            return (
            <TableRow key={candidate.id} className="group">
              <TableCell className="relative font-medium">
                <TableRowLink href={`/dashboard/candidates/${candidate.id}`} />
                <div className="flex flex-wrap items-center gap-2">
                  {getFullName(candidate.firstName, candidate.lastName)}
                  {candidate.doNotContact && (
                    <Badge className="bg-destructive/10 text-destructive">
                      Non ricontattare
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{candidate.email}</TableCell>
              <TableCell>
                {activeApplications.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {activeApplications.map((application) => (
                      <div key={application.id} className="flex flex-col">
                        <span>{application.position.title}</span>
                        {application.position.experienceLevel && (
                          <span className="text-muted-foreground text-xs">
                            {application.position.experienceLevel}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    Nessuna posizione
                  </span>
                )}
              </TableCell>
              <TableCell>
                {furthest ? (
                  <ApplicationStageBadge stage={furthest.stage} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {candidate.createdAt &&
                  format(new Date(candidate.createdAt), "dd MMM yyyy", {
                    locale: it,
                  })}
              </TableCell>
              <TableCell className="z-10 relative text-right">
                <EntityActionsMenu
                  entityId={candidate.id}
                  editHref={`/dashboard/candidates/${candidate.id}/edit`}
                  deleteAction={deleteCandidateAction.bind(null, candidate.id)}
                  deleteTitle="Elimina candidato"
                  deleteDescription="Sei sicuro di voler eliminare questo candidato? Questa azione non può essere annullata."
                  deleteErrorMessage="Errore durante l'eliminazione del candidato"
                >
                  <DropdownMenuItem
                    render={
                      <Link
                        href={`/dashboard/candidates/${candidate.id}/quiz`}
                      />
                    }
                  >
                    <Link2 className="mr-1 size-4" />
                    Associa quiz
                  </DropdownMenuItem>
                  {candidate.assessments && candidate.assessments.length > 0 && (
                    <DropdownMenuItem
                      render={
                        <Link
                          href={`/dashboard/assessments/${candidate.assessments[0].id}`}
                        />
                      }
                    >
                      <FileText className="mr-1 size-4" />
                      Visualizza risultati
                    </DropdownMenuItem>
                  )}
                </EntityActionsMenu>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
