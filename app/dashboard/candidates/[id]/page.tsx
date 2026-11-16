import { getRecentCandidateIds } from "@/lib/data/candidates";
import { Suspense } from "react";
import { CandidateDetailsContent } from "./candidate-details-content";
import { CandidateHeader } from "./candidate-header";
import { CandidateApplicationsContent } from "./candidate-applications-content";
import {
  CandidateApplicationsSkeleton,
  CandidateDetailsSkeleton,
  CandidateHeaderSkeleton,
} from "./fallbacks";

export async function generateStaticParams() {
  const candidateIds = await getRecentCandidateIds(100);

  return candidateIds.map((id) => ({ id }));
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<CandidateHeaderSkeleton />}>
        <CandidateHeader params={params} />
      </Suspense>

      <Suspense fallback={<CandidateDetailsSkeleton />}>
        <CandidateDetailsContent params={params} />
      </Suspense>

      <Suspense fallback={<CandidateApplicationsSkeleton />}>
        <CandidateApplicationsContent params={params} />
      </Suspense>
    </div>
  );
}
