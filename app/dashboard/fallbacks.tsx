import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardStatsSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="flex flex-row justify-between items-center pb-2">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="rounded-full size-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-16 h-8" />
        <Skeleton className="mt-2 w-32 h-3" />
      </CardContent>
    </Card>
  );
}

export function RecentPositionsSkeleton() {
  return (
    <>
      {/* Recent positions skeleton */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>
            <Skeleton className="rounded w-32 h-5" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="rounded w-40 h-4" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div>
                  <Skeleton className="mb-1 rounded w-32 h-4" />
                  <Skeleton className="rounded w-20 h-3" />
                </div>
                <Skeleton className="rounded w-20 h-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent activity skeleton 
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>
              <div className="bg-muted rounded w-32 h-5" />
            </CardTitle>
            <CardDescription>
              <div className="bg-muted rounded w-40 h-4" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[140px]">
              <div className="bg-muted mb-2 rounded w-32 h-4" />
              <div className="bg-muted rounded w-24 h-3" />
            </div>
          </CardContent>
        </Card> */}
    </>
  );
}
