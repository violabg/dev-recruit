import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

export function QuizCardsSkeleton() {
  return (
    <div className="gap-4 grid grid-cols-1 @[1060px]:grid-cols-2 @[1470px]:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="flex flex-col animate-pulse">
          <CardHeader className="pb-2">
            <Skeleton className="w-32 h-5" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="w-24 h-6" />
                <Skeleton className="w-20 h-6" />
              </div>
              <div className="flex justify-between text-sm">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-24 h-4" />
              </div>
            </div>
          </CardContent>
          <div className="flex gap-2 mt-auto pt-2 w-full">
            <Skeleton className="flex-1 h-8" />
            <Skeleton className="flex-1 h-8" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function QuizTableSkeleton() {
  return (
    <div className="border rounded-md">
      <div className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex gap-4 pb-3 border-b">
            <Skeleton className="w-[250px] h-4" />
            <Skeleton className="flex-1 h-4" />
            <Skeleton className="w-20 h-4" />
            <Skeleton className="w-20 h-4" />
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-16 h-4" />
          </div>
          {/* Rows */}
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 py-3">
              <Skeleton className="w-[250px] h-4" />
              <div className="flex flex-col flex-1 gap-1">
                <Skeleton className="w-32 h-4" />
                <Skeleton className="w-20 h-5" />
              </div>
              <Skeleton className="w-20 h-4" />
              <Skeleton className="w-16 h-6" />
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-8 h-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function QuizListSkeleton() {
  return (
    <Card>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="w-40 h-9" />
          <Skeleton className="w-32 h-4" />
        </div>
        <QuizTableSkeleton />
      </CardContent>
    </Card>
  );
}

export function QuizzesStatisticsSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="animate-pulse">
        <CardHeader>
          <Skeleton className="w-20 h-5" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex justify-between">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-12 h-4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="animate-pulse">
        <CardHeader>
          <Skeleton className="w-32 h-5" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex justify-between">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-12 h-4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="animate-pulse">
        <CardHeader>
          <Skeleton className="w-20 h-5" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-full h-8" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================
// RUNTIME FALLBACK
// ===================

export const QuizzesRuntimeFallback = () => (
  <div className="space-y-4">
    <QuizListSkeleton />
  </div>
);
