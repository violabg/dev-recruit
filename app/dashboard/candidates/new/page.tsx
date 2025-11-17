import { CandidateNewForm } from "@/components/candidates/candidate-new-form";
import { getCurrentUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

type NewCandidatePageProps = {
  searchParams: Promise<{ positionId?: string }>;
};

export default async function NewCandidatePage({
  searchParams,
}: NewCandidatePageProps) {
  const params = await searchParams;
  const positionId = params.positionId;

  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px]">
        <p className="font-medium text-lg">Accesso richiesto</p>
        <p className="mt-2 text-muted-foreground text-sm">
          Effettua l&apos;accesso per aggiungere un candidato
        </p>
      </div>
    );
  }

  const positions = await prisma.position.findMany({
    where: { createdBy: user.id },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

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
          <CandidateNewForm
            positions={positions || []}
            defaultPositionId={validPositionId}
          />
        </div>
      </div>
    </div>
  );
}
