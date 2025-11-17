import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-32 rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-64 rounded" />
          <div className="mt-1 flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded" />
            <Skeleton className="h-6 w-24 rounded" />
            <Skeleton className="h-6 w-24 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded" />
          <Skeleton className="h-10 w-32 rounded" />
          <Skeleton className="h-10 w-24 rounded" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-8 w-40 rounded" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
