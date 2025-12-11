import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PositionDetailSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-4">
        <div className="space-y-3">
          <Skeleton className="w-2/3 h-8" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-24 h-6" />
            <Skeleton className="w-32 h-6" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-6 pb-6 overflow-y-auto">
        <div className="space-y-2">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-full h-16" />
          <Skeleton className="w-full h-16" />
        </div>

        <div className="space-y-3">
          <Skeleton className="w-32 h-4" />
          <div className="flex flex-wrap gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-20 h-6" />
            ))}
          </div>
        </div>

        <div className="pt-2 border-t">
          <Skeleton className="w-40 h-3" />
        </div>
      </CardContent>
    </Card>
  );
}
