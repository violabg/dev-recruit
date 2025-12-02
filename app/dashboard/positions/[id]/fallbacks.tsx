import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PositionHeaderSkeleton() {
  return (
    <div className="flex justify-between items-center">
      <div>
        <Skeleton className="mb-2 w-64 h-10" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-24 h-6" />
          <Skeleton className="w-24 h-6" />
          <Skeleton className="w-40 h-4" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="w-28 h-9" />
        <Skeleton className="w-10 h-9" />
      </div>
    </div>
  );
}

export function PositionDetailsSkeleton() {
  return (
    <div className="gap-4 grid md:grid-cols-2">
      <Card>
        <CardHeader>
          <Skeleton className="w-32 h-6" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-3/4 h-4" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="w-40 h-6" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-20 h-6" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="w-28 h-6" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="w-24 h-6" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function PositionQuizzesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="w-32 h-6" />
        <Skeleton className="w-28 h-9" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-16" />
        ))}
      </div>
    </div>
  );
}

export function PositionCandidatesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="w-32 h-6" />
        <Skeleton className="w-28 h-9" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-16" />
        ))}
      </div>
    </div>
  );
}
