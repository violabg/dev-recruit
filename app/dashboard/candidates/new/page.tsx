import { CandidateForm } from "@/components/candidates/candidate-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Nuovo Candidato</CardTitle>
        <CardDescription>
          Inserisci i dati del candidato da aggiungere
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CandidateForm
          mode="new"
          positions={positions}
          defaultPositionId={validPositionId}
        />
      </CardContent>
    </Card>
  );
}
