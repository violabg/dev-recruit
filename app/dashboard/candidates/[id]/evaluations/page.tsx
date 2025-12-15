import { Button } from "@/components/ui/button";
import { getCandidateWithDetails } from "@/lib/data/candidates";
import { getEvaluationsByCandidateId } from "@/lib/data/evaluations";
import { getAllPositions } from "@/lib/data/positions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CandidateEvaluationsView } from "./evaluations-view";

export default async function CandidateEvaluationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [candidate, evaluations, positions] = await Promise.all([
    getCandidateWithDetails(id),
    getEvaluationsByCandidateId(id),
    getAllPositions(),
  ]);

  if (!candidate) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Candidato non trovato</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/candidates">Torna ai candidati</Link>
        </Button>
      </div>
    );
  }

  const fullName = `${candidate.firstName} ${candidate.lastName}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/candidates/${id}`}>
            <ArrowLeft className="mr-1 size-4" />
            Torna al candidato
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="font-bold text-3xl">Valutazioni: {fullName}</h1>
        <p className="mt-1 text-muted-foreground">
          Valutazioni del curriculum per diverse posizioni
        </p>
      </div>

      <CandidateEvaluationsView
        candidateId={candidate.id}
        candidateName={fullName}
        evaluations={evaluations}
        positions={positions}
        hasResume={!!candidate.resumeUrl}
      />
    </div>
  );
}
