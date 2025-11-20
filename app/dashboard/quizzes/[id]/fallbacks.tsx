import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function QuizDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="w-48 h-8" />
      </div>

      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="mb-2 w-64 h-10" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-24 h-6" />
            <Skeleton className="w-24 h-6" />
            <Skeleton className="w-28 h-6" />
            <Skeleton className="w-32 h-4" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-28 h-10" />
          <Skeleton className="w-36 h-10" />
          <Skeleton className="w-28 h-10" />
        </div>
      </div>

      <div>
        <div className="flex gap-2 mb-4">
          <Skeleton className="w-32 h-10" />
          <Skeleton className="w-32 h-10" />
          <Skeleton className="w-32 h-10" />
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Skeleton className="rounded-full w-6 h-6" />
                  <Skeleton className="w-32 h-5" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Skeleton className="mb-1 w-24 h-4" />
                  <Skeleton className="w-64 h-4" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="mb-1 w-20 h-4" />
                  <Skeleton className="w-40 h-4" />
                  <Skeleton className="w-32 h-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
