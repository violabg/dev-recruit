import { Skeleton } from "@/components/ui/skeleton";

export function ApplyFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Name fields */}
      <div className="gap-4 grid sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-full h-10" />
        </div>
        <div className="space-y-2">
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-full h-10" />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Skeleton className="w-14 h-4" />
        <Skeleton className="w-full h-10" />
      </div>

      {/* Date of birth */}
      <div className="space-y-2">
        <Skeleton className="w-28 h-4" />
        <Skeleton className="w-40 h-10" />
      </div>

      {/* Position select */}
      <div className="space-y-2">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-full h-10" />
      </div>

      {/* File upload */}
      <div className="space-y-2">
        <Skeleton className="w-full h-24" />
      </div>

      {/* Submit button */}
      <Skeleton className="w-full h-10" />
    </div>
  );
}
