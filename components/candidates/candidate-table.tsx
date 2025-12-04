"use client";
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
import { deleteCandidate } from "@/lib/actions/candidates";
import { CandidateWithRelations } from "@/lib/data/candidates";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowUpDown, FileText, Link2 } from "lucide-react";
import Link from "next/link";
import { EntityActionsMenu } from "../ui/entity-actions-menu";
import { CandidateStatusBadge } from "./candidate-status-badge";

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
            <TableHead>Stato</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => (
            <TableRow key={candidate.id} className="group">
              <TableCell className="relative font-medium">
                <TableRowLink href={`/dashboard/candidates/${candidate.id}`} />
                {getFullName(candidate.firstName, candidate.lastName)}
              </TableCell>
              <TableCell>{candidate.email}</TableCell>
              <TableCell>
                {candidate.position ? (
                  <div className="flex flex-col">
                    <span>{candidate.position.title}</span>
                    {candidate.position.experienceLevel && (
                      <span className="text-muted-foreground text-xs">
                        {candidate.position.experienceLevel}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    Nessuna posizione
                  </span>
                )}
              </TableCell>
              <TableCell>
                <CandidateStatusBadge status={candidate.status} />
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
                  deleteAction={deleteCandidate.bind(null, candidate.id)}
                  deleteTitle="Elimina candidato"
                  deleteDescription="Sei sicuro di voler eliminare questo candidato? Questa azione non può essere annullata."
                  deleteErrorMessage="Errore durante l'eliminazione del candidato"
                >
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/candidates/${candidate.id}/quiz`}>
                      <Link2 className="mr-1 size-4" />
                      Associa quiz
                    </Link>
                  </DropdownMenuItem>
                  {candidate.interviews && candidate.interviews.length > 0 && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/dashboard/interviews/${candidate.interviews[0].id}`}
                      >
                        <FileText className="mr-1 size-4" />
                        Visualizza risultati
                      </Link>
                    </DropdownMenuItem>
                  )}
                </EntityActionsMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
