import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
export const StatsSkeleton = () => (
  <div className="gap-4 grid md:grid-cols-4">
    {Array.from({ length: 2 }).map((_, index) => (
      <Card key={index}>
        <CardHeader className="pb-2">
          <CardTitle>
            <Skeleton className="w-24 h-4" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-1/2 h-10" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const FiltersSkeleton = () => (
  <div className="flex md:flex-row flex-col gap-4">
    <Skeleton className="flex-1 h-10" />
    <Skeleton className="w-full md:w-[153px] h-10" />
    <Skeleton className="w-full md:w-[182px] h-10" />
    <Skeleton className="w-full md:w-[142px] h-10" />
  </div>
);

export const CandidatesListSkeleton = () => (
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
