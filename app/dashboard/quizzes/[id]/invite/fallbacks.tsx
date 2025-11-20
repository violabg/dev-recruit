import { Skeleton } from "@/components/ui/skeleton";

export function InviteCandidatesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back button skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-40 h-10" />
      </div>

      {/* Title skeleton */}
      <div>
        <Skeleton className="mb-2 w-96 h-10" />
        <Skeleton className="w-64 h-5" />
      </div>

      {/* Tabs skeleton */}
      <div className="border-border border-b">
        <div className="flex gap-4">
          <Skeleton className="w-32 h-10" />
          <Skeleton className="w-40 h-10" />
        </div>
      </div>

      {/* Tab content skeleton */}
      <div className="space-y-4">
        {/* Card for form section */}
        <div className="space-y-4 p-6 border border-border rounded-lg">
          <Skeleton className="mb-4 w-48 h-6" />

          {/* Form fields */}
          <div className="space-y-3">
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
          </div>

          {/* Submit button */}
          <Skeleton className="w-32 h-10" />
        </div>

        {/* Table skeleton */}
        <div className="p-4 border border-border rounded-lg">
          <Skeleton className="mb-4 w-64 h-6" />

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="w-48 h-5" />
              <Skeleton className="w-20 h-5" />
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex justify-between items-center pt-3 border-t"
              >
                <Skeleton className="w-56 h-5" />
                <Skeleton className="w-20 h-5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
