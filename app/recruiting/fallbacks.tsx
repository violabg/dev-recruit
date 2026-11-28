import { StationTrackSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors ApplyFlow on its first step: track, heading, position rows. */
export function ApplyFlowSkeleton() {
  return (
    <div className="flex flex-col gap-8 mx-auto max-w-3xl">
      <div className="mx-auto w-full max-w-sm">
        <StationTrackSkeleton count={2} />
      </div>
      <div>
        <Skeleton className="mb-4 w-44 h-7" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="bg-card px-5 py-4 border rounded-xl">
              <Skeleton className="w-64 h-6" />
              <Skeleton className="mt-2 w-40 h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
