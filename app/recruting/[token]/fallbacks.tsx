import { Skeleton } from "@/components/ui/skeleton";

export function InterviewSkeleton() {
  return (
    <div className="flex flex-col justify-center items-center bg-background min-h-dvh">
      <div className="space-y-6 bg-card shadow-lg p-6 border rounded-lg w-full max-w-2xl">
        {/* Header */}
        <div className="space-y-3 text-center">
          <Skeleton className="mx-auto w-80 h-8" />
          <Skeleton className="mx-auto w-96 h-5" />
        </div>

        {/* Interview info */}
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Skeleton className="w-40 h-5" />
            <Skeleton className="w-full h-10" />
          </div>
          <div className="space-y-2">
            <Skeleton className="w-40 h-5" />
            <Skeleton className="w-full h-10" />
          </div>
        </div>

        {/* Question preview */}
        <div className="space-y-4 pt-4 border-t">
          <Skeleton className="w-48 h-6" />
          <div className="space-y-3">
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
          </div>
        </div>

        {/* Action button */}
        <div className="pt-4 border-t">
          <Skeleton className="w-full h-10" />
        </div>
      </div>
    </div>
  );
}
