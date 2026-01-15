"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { EntityActionsMenu } from "@/components/ui/entity-actions-menu";
import { deleteCandidate } from "@/lib/actions/candidates";
import { CandidateWithRelations } from "@/lib/data/candidates";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Briefcase,
  Calendar,
  Eye,
  FileText,
  Link2,
  Mail,
  User,
} from "lucide-react";
import Link from "next/link";
import { CandidateStatusBadge } from "./candidate-status-badge";

interface CandidateGridProps {
  candidates: CandidateWithRelations[];
}

// Get full name from firstName and lastName
function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

// Get initials from firstName and lastName
function getInitials(firstName: string, lastName: string): string {
  const firstInitial = firstName?.[0] || "";
  const lastInitial = lastName?.[0] || "";
  return `${firstInitial}${lastInitial}`.toUpperCase();
}

// Candidate grid component
export function CandidateGrid({ candidates }: CandidateGridProps) {
  return (
    <div className="gap-4 grid sm:grid-cols-2 lg:grid-cols-3">
      {candidates.map((candidate) => (
        <Card key={candidate.id} className="overflow-hidden">
          <CardHeader className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    {getInitials(candidate.firstName, candidate.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {getFullName(candidate.firstName, candidate.lastName)}
                  </h3>
                  <div className="flex items-center text-muted-foreground text-sm">
                    <Mail className="mr-1 w-3 h-3" />
                    {candidate.email}
                  </div>
                </div>
              </div>
              <EntityActionsMenu
                entityId={candidate.id}
                editHref={`/dashboard/candidates/${candidate.id}/edit`}
                deleteAction={deleteCandidate.bind(null, candidate.id)}
                deleteTitle="Elimina candidato"
                deleteDescription="Sei sicuro di voler eliminare questo candidato? Questa azione non può essere annullata."
                deleteErrorMessage="Errore durante l'eliminazione del candidato"
              >
                <DropdownMenuItem
                  render={
                    <Link href={`/dashboard/candidates/${candidate.id}`} />
                  }
                >
                  <User className="mr-1 size-4" />
                  Visualizza profilo
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Link href={`/dashboard/candidates/${candidate.id}/quiz`} />
                  }
                >
                  <Link2 className="mr-1 size-4" />
                  Associa quiz
                </DropdownMenuItem>
                {candidate.interviews && candidate.interviews.length > 0 && (
                  <DropdownMenuItem
                    render={
                      <Link
                        href={`/dashboard/interviews/${candidate.interviews[0].id}`}
                      />
                    }
                  >
                    <FileText className="mr-1 size-4" />
                    Visualizza risultati
                  </DropdownMenuItem>
                )}
              </EntityActionsMenu>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 pt-0">
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Briefcase className="mr-2 size-4 text-muted-foreground" />
                {candidate.positions && candidate.positions.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {candidate.positions.map((cp) => (
                      <div key={cp.id}>
                        <div className="flex items-center gap-1">
                          <span>{cp.position.title}</span>
                          {cp.isPrimary && (
                            <span className="bg-primary/10 px-1.5 py-0.5 rounded text-primary text-xs">
                              Primaria
                            </span>
                          )}
                        </div>
                        {cp.position.experienceLevel && (
                          <span className="text-muted-foreground text-xs">
                            {" "}
                            • {cp.position.experienceLevel}
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
              </div>
              <div className="flex items-center text-sm">
                <Calendar className="mr-2 size-4 text-muted-foreground" />
                {candidate.createdAt && (
                  <span>
                    Aggiunto il{" "}
                    {format(new Date(candidate.createdAt), "dd MMMM yyyy", {
                      locale: it,
                    })}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center p-4 border-t">
            <CandidateStatusBadge status={candidate.status} />
            <Button
              render={<Link href={`/dashboard/candidates/${candidate.id}`} />}
              variant="outline"
              size="sm"
              nativeButton={false}
            >
              <Eye className="mr-1 size-4 text-primary" />
              Visualizza
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
