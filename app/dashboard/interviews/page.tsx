import { Suspense } from "react";

import { InterviewsSkeleton } from "./fallbacks";
import {
  InterviewsRuntimeSection,
  type InterviewsSearchParams,
} from "./runtime-section";

export default function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<InterviewsSearchParams>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Colloqui</h1>
          <p className="text-muted-foreground text-sm">
            Gestisci tutti i colloqui tecnici
          </p>
        </div>
      </div>

      <Suspense fallback={<InterviewsSkeleton />}>
        <InterviewsRuntimeSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
