import { CandidateForm } from "@/components/candidates/candidate-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getCandidatePositions,
  getCandidateWithDetails,
} from "@/lib/data/candidates";
import { ArrowLeft } from "lucide-react";
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
    <Card>
      <CardHeader className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={
              `/dashboard/candidates/${candidate.id}` as Route<`/dashboard/candidates/${string}`>
            }
          >
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <CardTitle className="text-2xl">Modifica Candidato</CardTitle>
          <CardDescription>
            Aggiorna i dati per mantenere le informazioni sincronizzate.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <CandidateForm
          mode="edit"
          positions={positionOptions}
          candidate={{
            id: candidate.id,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email,
            dateOfBirth: candidate.dateOfBirth,
            positionId: candidate.positionId,
            status: candidate.status,
            resumeUrl: candidate.resumeUrl,
          }}
        />
      </CardContent>
    </Card>
  );
}
