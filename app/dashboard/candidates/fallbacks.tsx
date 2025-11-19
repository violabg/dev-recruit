import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  <Card>
    <CardHeader>
      <CardTitle>
        <Skeleton className="w-32 h-4" />
      </CardTitle>
      <CardDescription>
        <Skeleton className="w-40 h-3" />
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 1 }).map((_, index) => (
          <Skeleton key={index} className="w-full h-12" />
        ))}
      </div>
    </CardContent>
  </Card>
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
