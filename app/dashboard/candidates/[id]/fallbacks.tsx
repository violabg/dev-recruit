import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CandidateHeaderSkeleton() {
  return (
    <div className="flex justify-between items-center">
      <div>
        <Skeleton className="mb-2 w-64 h-10" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-20 h-6" />
          <Skeleton className="w-28 h-6" />
          <Skeleton className="w-40 h-4" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-28 h-10" />
        <Skeleton className="w-24 h-10" />
        <Skeleton className="w-10 h-10" />
      </div>
    </div>
  );
}

export function CandidateDetailsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="w-40 h-6" />
      </CardHeader>
      <CardContent>
        <div className="gap-4 grid md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-2 w-24 h-4" />
              <Skeleton className="w-32 h-5" />
            </div>
          ))}
          <div className="md:col-span-2">
            <Skeleton className="mb-2 w-24 h-4" />
            <Skeleton className="w-40 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CandidateInterviewsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="w-24 h-6" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex justify-between items-center pb-2 border-b last:border-b-0"
            >
              <div>
                <Skeleton className="mb-1 w-24 h-5" />
                <Skeleton className="w-32 h-4" />
              </div>
              <Skeleton className="w-28 h-5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
