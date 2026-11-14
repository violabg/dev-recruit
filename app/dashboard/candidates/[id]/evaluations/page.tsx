import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

import { getCandidateWithDetails } from "@/lib/data/candidates";
import { getEvaluationsByCandidateId } from "@/lib/data/evaluations";
import { getAllPositions } from "@/lib/data/positions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CandidateEvaluationsView } from "./evaluations-view";
import { Suspense } from "react";
import { CandidateEvaluationsSkeleton } from "../sub-page-fallbacks";

/**
 * Static shell: the route `params` are only read inside the Suspense
 * boundary, so navigations into this page are instant (see
 * https://nextjs.org/docs/messages/instant-shell-url-data).
 */
export default function CandidateEvaluationsPage(
  props: Parameters<typeof CandidateEvaluationsContent>[0]
) {
  return (
    <Suspense fallback={<CandidateEvaluationsSkeleton />}>
      <CandidateEvaluationsContent {...props} />
    </Suspense>
  );
}

async function CandidateEvaluationsContent({
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
        <Link
          href="/dashboard/candidates"
          className={cn("mt-4", buttonVariants({ variant: "default" }))}
        >
          Torna ai candidati
        </Link>
      </div>
    );
  }

  const fullName = `${candidate.firstName} ${candidate.lastName}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/candidates/${id}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "inline-flex",
          )}
        >
          <ArrowLeft className="mr-1 size-4" />
          Torna al candidato
        </Link>
      </div>

      <div>
        <h1 className="font-display font-extrabold text-heading text-[2.125rem] lg:text-[2.5rem] text-balance leading-[2.5rem] lg:leading-[2.875rem] tracking-[-0.03em]">Valutazioni: {fullName}</h1>
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
