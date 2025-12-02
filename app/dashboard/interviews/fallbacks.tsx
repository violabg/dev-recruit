import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const InterviewsSkeleton = () => (
  <div className="space-y-6">
    {/* Stats Grid */}
    <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle>
              <Skeleton className="w-20 h-4" />
            </CardTitle>
            <Skeleton className="size-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 w-16 h-8" />
            <Skeleton className="w-24 h-3" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Filters */}
    <div className="flex sm:flex-row flex-col gap-4">
      <Skeleton className="flex-1 h-10" />
      <div className="flex flex-wrap gap-4">
        <Skeleton className="w-[140px] h-10" />
        <Skeleton className="w-[140px] h-10" />
        <Skeleton className="w-[140px] h-10" />
      </div>
    </div>

    {/* Summary Line */}
    <div className="flex items-center gap-2">
      <Skeleton className="w-32 h-4" />
      <Skeleton className="rounded-full w-20 h-5" />
      <Skeleton className="rounded-full w-24 h-5" />
    </div>

    {/* Table Card */}
    <Card className="animate-pulse">
      <CardHeader>
        <CardTitle>
          <Skeleton className="w-32 h-5" />
        </CardTitle>
        <div className="space-y-2">
          <Skeleton className="w-full max-w-md h-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2 last:border-0 border-b"
            >
              <div className="space-y-2">
                <Skeleton className="w-40 h-4" />
                <Skeleton className="w-32 h-3" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="rounded-full w-24 h-6" />
                <Skeleton className="w-20 h-4" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-4">
          <Skeleton className="w-64 h-10" />
        </div>
      </CardContent>
    </Card>
  </div>
);
