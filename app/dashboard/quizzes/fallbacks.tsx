import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FiltersSkeleton() {
  return (
    <div className="flex sm:flex-row flex-col gap-4">
      {/* Search input skeleton */}
      <div className="relative flex-1">
        <Skeleton className="w-full h-9" />
      </div>
      {/* Filter selects skeleton */}
      <div className="flex gap-2">
        <Skeleton className="w-[142px] h-9" />
        <Skeleton className="w-[145px] h-9" />
        <Skeleton className="w-[183px] h-9" />
      </div>
    </div>
  );
}

export function QuizListSkeleton() {
  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Skeleton className="w-24 h-8" />
              <Skeleton className="w-24 h-8" />
            </div>
            <Skeleton className="w-32 h-4" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="w-full h-12" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
