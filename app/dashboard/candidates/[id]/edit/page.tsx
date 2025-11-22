import {
  CandidateForm,
  EditableCandidate,
} from "@/components/candidates/candidate-form";
import {
  getCandidatePositions,
  getCandidateWithDetails,
} from "@/lib/data/candidates";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CandidateFormSkeleton } from "../../new/fallbacks";

type CandidateEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CandidateEditPage({
  params,
}: CandidateEditPageProps) {
  return (
    <Suspense fallback={<CandidateFormSkeleton />}>
      <CandidateEditContent params={params} />
    </Suspense>
  );
}

async function CandidateEditContent({ params }: CandidateEditPageProps) {
  const { id } = await params;
  const [candidate, positions] = await Promise.all([
    getCandidateWithDetails(id),
    getCandidatePositions(),
  ]);

  if (!candidate) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-bold text-3xl">Candidato non trovato</h1>
          <p className="text-muted-foreground">
            Il candidato richiesto non esiste o non è più disponibile.
          </p>
        </div>
        <Link
          href="/dashboard/candidates"
          className="font-semibold text-primary text-sm"
        >
          Torna alla lista dei candidati
        </Link>
      </div>
    );
  }

  const positionOptions = positions || [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="font-bold text-3xl">Modifica candidato</h1>
            <p className="text-muted-foreground">
              Aggiorna i dati per mantenere le informazioni sincronizzate.
            </p>
          </div>
          <div className="text-right">
            <Link
              href={
                `/dashboard/candidates/${candidate.id}` as Route<`/dashboard/candidates/${string}`>
              }
              className="font-semibold text-primary text-sm"
            >
              Vai al profilo
            </Link>
          </div>
        </div>
      </div>
      <div className="max-w-xl">
        <div className="p-6 border rounded-md">
          <h2 className="mb-4 font-semibold text-xl">Dati candidato</h2>
          <CandidateForm
            mode="edit"
            positions={positionOptions}
            candidate={{
              id: candidate.id,
              name: candidate.name,
              email: candidate.email,
              positionId: candidate.positionId,
              status: candidate.status as EditableCandidate["status"],
              resumeUrl: candidate.resumeUrl,
            }}
          />
        </div>
      </div>
    </div>
  );
}
