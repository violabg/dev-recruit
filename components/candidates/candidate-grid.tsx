"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreHorizontal,
  Trash,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CandidateStatusBadge } from "./candidate-status-badge";

interface CandidateGridProps {
  candidates: CandidateWithRelations[];
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// Candidate grid component
export function CandidateGrid({ candidates }: CandidateGridProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Handle delete candidate
  async function handleDelete(id: string) {
    if (confirm("Sei sicuro di voler eliminare questo candidato?")) {
      setIsDeleting(id);
      try {
        await deleteCandidate(id);
      } catch (error) {
        console.error("Error deleting candidate:", error);
        alert(
          "Si è verificato un errore durante l'eliminazione del candidato."
        );
      } finally {
        setIsDeleting(null);
      }
    }
  }

  return (
    <div className="gap-4 grid sm:grid-cols-2 lg:grid-cols-3">
      {candidates.map((candidate) => (
        <Card key={candidate.id} className="overflow-hidden">
          <CardHeader className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>{getInitials(candidate.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{candidate.name}</h3>
                  <div className="flex items-center text-muted-foreground text-sm">
                    <Mail className="mr-1 w-3 h-3" />
                    {candidate.email}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="p-0 w-8 h-8">
                    <span className="sr-only">Apri menu</span>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/candidates/${candidate.id}`}>
                      <User className="mr-1 w-4 h-4" />
                      Visualizza profilo
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/candidates/${candidate.id}/quiz`}>
                      <Link2 className="mr-1 w-4 h-4" />
                      Associa quiz
                    </Link>
                  </DropdownMenuItem>
                  {candidate.interviews && candidate.interviews.length > 0 && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/dashboard/interviews/${candidate.interviews[0].id}`}
                      >
                        <FileText className="mr-1 w-4 h-4" />
                        Visualizza risultati
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(candidate.id)}
                    disabled={isDeleting === candidate.id}
                    className="text-red-600"
                  >
                    <Trash className="mr-1 w-4 h-4" />
                    {isDeleting === candidate.id
                      ? "Eliminazione..."
                      : "Elimina"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Briefcase className="mr-2 w-4 h-4 text-muted-foreground" />
                {candidate.position ? (
                  <div>
                    <span>{candidate.position.title}</span>
                    {candidate.position.experienceLevel && (
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        • {candidate.position.experienceLevel}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    Nessuna posizione
                  </span>
                )}
              </div>
              <div className="flex items-center text-sm">
                <Calendar className="mr-2 w-4 h-4 text-muted-foreground" />
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
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/candidates/${candidate.id}`}>
                <Eye className="mr-1 w-4 h-4 text-primary" />
                Visualizza
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
