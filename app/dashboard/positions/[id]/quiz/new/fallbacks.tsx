import { Skeleton } from "@/components/ui/skeleton";

export function QuizGeneratorSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="w-80 h-10" />
        <Skeleton className="w-96 h-5" />
      </div>

      {/* Two column layout */}
      <div className="gap-6 grid md:grid-cols-2">
        {/* Left column - Form */}
        <div className="space-y-4 p-6 border border-border rounded-lg">
          <Skeleton className="mb-4 w-48 h-6" />

          {/* Form fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="w-32 h-5" />
              <Skeleton className="w-full h-10" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-32 h-5" />
              <Skeleton className="w-full h-10" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-32 h-5" />
              <Skeleton className="w-full h-32" />
            </div>
          </div>

          {/* Submit button */}
          <Skeleton className="w-full h-10" />
        </div>

        {/* Right column - Info card */}
        <div className="space-y-4 p-6 border border-border rounded-lg">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Skeleton className="rounded w-5 h-5" />
            <Skeleton className="w-48 h-6" />
          </div>

          <div className="space-y-3">
            <div>
              <Skeleton className="mb-1 w-32 h-5" />
              <Skeleton className="w-40 h-5" />
            </div>
            <div>
              <Skeleton className="mb-1 w-32 h-5" />
              <Skeleton className="w-40 h-5" />
            </div>
            <div>
              <Skeleton className="mb-1 w-32 h-5" />
              <Skeleton className="w-full h-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
