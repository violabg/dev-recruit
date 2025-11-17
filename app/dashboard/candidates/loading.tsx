import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CandidatesLoading() {
  return (
    <div className="space-y-6">
      {/* Header Section Skeleton */}
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4">
        <div>
          <Skeleton className="w-48 h-9" />
          <Skeleton className="mt-2 w-72 h-4" />
        </div>
        <Skeleton className="w-36 h-10" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="gap-4 grid md:grid-cols-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <Skeleton className="w-24 h-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="w-12 h-8" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Section Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="w-20 h-6" />
          <Skeleton className="mt-1 w-48 h-4" />
        </CardHeader>
        <CardContent>
          <div className="gap-4 grid md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-full h-10" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Candidates List Section Skeleton */}
      <Card>
        <CardHeader className="space-y-0 pb-0">
          <div className="flex justify-between items-center pb-4">
            <div className="flex space-x-2">
              <Skeleton className="w-20 h-10" />
              <Skeleton className="w-20 h-10" />
            </div>
            <Skeleton className="w-32 h-4" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Skeleton for table/grid content */}
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-4 p-4 border rounded-md"
              >
                <Skeleton className="rounded-full w-12 h-12" />
                <div className="space-y-2">
                  <Skeleton className="w-[250px] h-4" />
                  <Skeleton className="w-[200px] h-4" />
                </div>
                <Skeleton className="ml-auto w-20 h-8" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 w-full h-[200px]" />
        </CardContent>
      </Card>
    </div>
  );
}
