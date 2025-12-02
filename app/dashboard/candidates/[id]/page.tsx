import { getRecentCandidateIds } from "@/lib/data/candidates";
import { Suspense } from "react";
import { CandidateDetailsContent } from "./candidate-details-content";
import { CandidateHeader } from "./candidate-header";
import { CandidateInterviewsContent } from "./candidate-interviews-content";
import {
  CandidateDetailsSkeleton,
  CandidateHeaderSkeleton,
  CandidateInterviewsSkeleton,
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
    <div className="space-y-6">
      <Suspense fallback={<CandidateHeaderSkeleton />}>
        <CandidateHeader params={params} />
      </Suspense>

      <Suspense fallback={<CandidateDetailsSkeleton />}>
        <CandidateDetailsContent params={params} />
      </Suspense>

      <Suspense fallback={<CandidateInterviewsSkeleton />}>
        <CandidateInterviewsContent params={params} />
      </Suspense>
    </div>
  );
}
