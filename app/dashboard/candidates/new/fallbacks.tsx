import { Skeleton } from "@/components/ui/skeleton";

export function CandidateFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="w-64 h-10" />
        <Skeleton className="w-96 h-5" />
      </div>

      {/* Form card */}
      <div className="max-w-xl">
        <div className="space-y-4 p-6 border rounded-md">
          <Skeleton className="mb-6 w-48 h-6" />

          {/* Form fields */}
          <div className="space-y-3">
            <Skeleton className="mb-2 w-20 h-5" />
            <Skeleton className="w-full h-10" />
          </div>

          <div className="space-y-3">
            <Skeleton className="mb-2 w-20 h-5" />
            <Skeleton className="w-full h-10" />
          </div>

          <div className="space-y-3">
            <Skeleton className="mb-2 w-20 h-5" />
            <Skeleton className="w-full h-10" />
          </div>

          <div className="space-y-3">
            <Skeleton className="mb-2 w-32 h-5" />
            <Skeleton className="w-full h-10" />
          </div>

          {/* Submit button */}
          <div className="pt-4">
            <Skeleton className="w-full h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
