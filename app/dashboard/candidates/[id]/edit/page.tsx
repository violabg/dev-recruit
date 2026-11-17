import { CandidateForm } from "@/components/candidates/candidate-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCandidateWithDetails } from "@/lib/data/candidates";
import { getOpenPositionsForSelect } from "@/lib/data/positions";
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
    <Suspense fallback={<CandidateFormSkeleton mode="edit" />}>
      <CandidateEditContent params={params} />
    </Suspense>
  );
}

async function CandidateEditContent({ params }: CandidateEditPageProps) {
  const { id } = await params;
  const [candidate, openPositions] = await Promise.all([
    getCandidateWithDetails(id),
    getOpenPositionsForSelect(),
  ]);

  if (!candidate) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display font-extrabold text-heading text-[2.125rem] lg:text-[2.5rem] text-balance leading-[2.5rem] lg:leading-[2.875rem] tracking-[-0.03em]">Candidato non trovato</h1>
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

  // Open positions plus the ones the candidate already holds: saving never
  // drops a position only because it is no longer open
  const optionsById = new Map(
    openPositions.map((position) => [position.id, position]),
  );
  for (const application of candidate.applications) {
    if (application.stage === "withdrawn") continue;
    if (!optionsById.has(application.position.id)) {
      optionsById.set(application.position.id, {
        id: application.position.id,
        title: application.position.title,
      });
    }
  }
  const positionOptions = [...optionsById.values()].sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  return (
    <Card>
      <CardHeader className="flex items-center gap-4">
        <Link
          href={
            `/dashboard/candidates/${candidate.id}` as Route<`/dashboard/candidates/${string}`>
          }
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
          })}
        >
          <ArrowLeft className="size-4" />
        </Link>
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
            // A withdrawn application does not count as a selected position
            positionIds: candidate.applications
              .filter((application) => application.stage !== "withdrawn")
              .map((application) => application.positionId),
            doNotContact: candidate.doNotContact,
            doNotContactNote: candidate.doNotContactNote,
            resumeUrl: candidate.resumeUrl,
          }}
        />
      </CardContent>
    </Card>
  );
}
