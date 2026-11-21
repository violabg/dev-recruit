import PageHeader from "@/components/page-header";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";

import { getCandidateWithDetails } from "@/lib/data/candidates";
import { getEvaluationsByCandidateId } from "@/lib/data/evaluations";
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

  const [candidate, evaluations] = await Promise.all([
    getCandidateWithDetails(id),
    getEvaluationsByCandidateId(id),
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
  // A resume evaluation needs an application: only the positions applied to
  const positions = candidate.applications.map((application) => ({
    id: application.position.id,
    title: application.position.title,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Valutazioni CV"
        description={`${fullName} · valutazioni del curriculum per posizione`}
        actionBtns={
          <Link
            href={`/dashboard/candidates/${id}` as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="size-4" />
            Torna al candidato
          </Link>
        }
      />

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
