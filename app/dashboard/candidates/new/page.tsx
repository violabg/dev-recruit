import { CandidateForm } from "@/components/candidates/candidate-form";
import { getPositionsForSelect } from "@/lib/data/positions";
import { Suspense } from "react";
import { CandidateFormSkeleton } from "./fallbacks";

type NewCandidatePageProps = {
  searchParams: Promise<{ positionId?: string }>;
};

export default async function NewCandidatePage({
  searchParams,
}: NewCandidatePageProps) {
  return (
    <Suspense fallback={<CandidateFormSkeleton />}>
      <CandidateFormContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CandidateFormContent({ searchParams }: NewCandidatePageProps) {
  const params = await searchParams;
  const positionId = params.positionId;

  const positions = await getPositionsForSelect();

  // Validate that the positionId exists if provided
  const validPositionId =
    positionId && positions.some((p) => p.id === positionId)
      ? positionId
      : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl">Nuovo Candidato</h1>
        <p className="text-muted-foreground">
          Inserisci i dati del candidato da aggiungere
        </p>
      </div>
      <div className="max-w-xl">
        <div className="p-6 border rounded-md">
          <h2 className="mb-4 font-semibold text-xl">Crea candidato</h2>
          <CandidateForm
            mode="new"
            positions={positions}
            defaultPositionId={validPositionId}
          />
        </div>
      </div>
    </div>
  );
}
