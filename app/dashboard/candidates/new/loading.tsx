import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-2 w-64 h-10" />
        <Skeleton className="w-80 h-6" />
      </div>
      <div className="max-w-xl">
        <div className="p-6 border rounded-md">
          <Skeleton className="mb-6 w-40 h-8" />
          <div className="space-y-6">
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="mt-4 w-32 h-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
