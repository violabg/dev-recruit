import { FieldSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the single-position apply page: band, details, form panel. */
export function PositionApplySkeleton() {
  return (
    <>
      <div className="bg-band border-b border-t-4 border-t-primary">
        <div className="mx-auto px-4 sm:px-8 pt-6 md:pt-8 pb-8 w-full max-w-6xl">
          <Skeleton className="w-28 h-5" />
          <Skeleton className="mt-6 w-96 max-w-full h-10" />
          <Skeleton className="mt-4 w-56 h-5" />
        </div>
      </div>
      <div className="items-start gap-8 grid grid-cols-1 lg:grid-cols-12 mx-auto px-4 sm:px-8 py-8 w-full max-w-6xl">
        <div className="bg-card p-5 sm:p-6 border rounded-xl lg:col-span-7">
          <Skeleton className="mb-4 w-36 h-7" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="mt-2 w-full h-4" />
          <Skeleton className="mt-2 w-2/3 h-4" />
          <Skeleton className="mt-6 w-48 h-6" />
        </div>
        <div className="flex flex-col gap-4 bg-card p-5 sm:p-6 border rounded-xl lg:col-span-5">
          <Skeleton className="w-28 h-7" />
          <FieldSkeleton label="Nome" required />
          <FieldSkeleton label="Email" required />
          <Skeleton className="rounded-lg w-full h-29" />
          <Skeleton className="rounded-lg w-full h-9" />
        </div>
      </div>
    </>
  );
}
