import { Skeleton } from "@/components/ui/skeleton";

export function ApplyFormSkeleton() {
  return (
    <div className="gap-6 grid grid-cols-1 lg:grid-cols-2 h-full">
      {/* Form skeleton - left column */}
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

      {/* Position detail skeleton - right column */}
      <div className="space-y-4">
        {/* Title */}
        <div className="space-y-3">
          <Skeleton className="w-3/4 h-8" />
          <Skeleton className="w-1/2 h-6" />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="w-1/4 h-4" />
          <Skeleton className="w-full h-20" />
        </div>

        {/* Skills section */}
        <div className="space-y-3">
          <Skeleton className="w-1/3 h-5" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="w-20 h-6" />
            <Skeleton className="w-24 h-6" />
            <Skeleton className="w-20 h-6" />
          </div>
        </div>

        {/* Soft Skills section */}
        <div className="space-y-3">
          <Skeleton className="w-1/3 h-5" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="w-20 h-6" />
            <Skeleton className="w-24 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
