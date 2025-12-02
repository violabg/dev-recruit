import { Skeleton } from "@/components/ui/skeleton";

export const PresetsListSkeleton = () => {
  return (
    <div className="space-y-4">
      <Skeleton className="w-full h-10" />
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/30 p-4 border-b">
          <div className="flex gap-4">
            <Skeleton className="w-[150px] h-4" />
            <Skeleton className="w-[100px] h-4" />
            <Skeleton className="w-[100px] h-4" />
            <Skeleton className="w-[100px] h-4" />
          </div>
        </div>
        <div className="space-y-6 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Skeleton className="rounded-md size-9" />
                <div className="space-y-2">
                  <Skeleton className="w-[200px] h-4" />
                  <Skeleton className="w-[140px] h-3" />
                </div>
              </div>
              <div className="flex gap-4">
                <Skeleton className="w-[100px] h-6" />
                <Skeleton className="w-20 h-6" />
                <Skeleton className="w-[120px] h-6" />
              </div>
              <Skeleton className="rounded-md size-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
