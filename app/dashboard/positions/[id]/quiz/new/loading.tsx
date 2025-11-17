import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-1/3 rounded" />
        <Skeleton className="h-5 w-1/2 mt-2 rounded" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Form skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-20 w-full rounded" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-20 w-full rounded" />
            <Skeleton className="h-20 w-full rounded" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3 rounded" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-16 w-full rounded" />
              <Skeleton className="h-16 w-full rounded" />
              <Skeleton className="h-16 w-full rounded" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded" />
          <Skeleton className="h-16 w-full rounded" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24 rounded" />
            <Skeleton className="h-10 w-32 rounded" />
          </div>
        </div>
        {/* Card skeleton */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-40 rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-12 w-full rounded" />
            </div>
            <div className="rounded-md bg-muted p-4 space-y-2">
              <Skeleton className="h-5 w-1/2 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-4 w-1/3 rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
