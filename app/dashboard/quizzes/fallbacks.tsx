import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
