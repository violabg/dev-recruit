import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-28" />
      </div>

      <div>
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="mt-2 h-5 w-3/4" />
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 border-b">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="space-y-4 pt-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
