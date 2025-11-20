import { Skeleton } from "@/components/ui/skeleton";

export function EditQuizSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 mb-6">
        <Skeleton className="w-80 h-10" />
        <Skeleton className="w-96 h-5" />
      </div>

      {/* Form sections */}
      <div className="space-y-6">
        {/* Quiz title section */}
        <div className="space-y-4 p-6 border border-border rounded-lg">
          <Skeleton className="mb-4 w-48 h-6" />
          <Skeleton className="w-full h-10" />
        </div>

        {/* Questions section */}
        <div className="space-y-4 p-6 border border-border rounded-lg">
          <Skeleton className="mb-4 w-48 h-6" />

          {/* Question cards */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 pt-4 border-t">
              <div className="flex justify-between items-center">
                <Skeleton className="w-64 h-5" />
                <Skeleton className="w-20 h-5" />
              </div>
              <Skeleton className="w-full h-10" />
              <Skeleton className="w-full h-24" />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Skeleton className="w-32 h-10" />
          <Skeleton className="w-32 h-10" />
        </div>
      </div>
    </div>
  );
}
