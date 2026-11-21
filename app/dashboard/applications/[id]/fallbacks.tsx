import {
  ButtonSkeleton,
  PageHeaderSkeleton,
  StationTrackSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors ApplicationHeader: band with links, owner, track and next action. */
export function ApplicationHeaderSkeleton() {
  return (
    <PageHeaderSkeleton
      titleClassName="w-72 max-w-full"
      info={
        <>
          <TextSkeleton className="w-40" />
          <TextSkeleton className="w-28" />
        </>
      }
      actions={
        <>
          <OwnerControlsSkeleton />
          <ButtonSkeleton size="sm" className="w-28" />
        </>
      }
    >
      <div className="flex flex-col">
        <StationTrackSkeleton count={7} />
        <NextActionSkeleton />
      </div>
    </PageHeaderSkeleton>
  );
}

/** Mirrors OwnerControls in the application header. */
export function OwnerControlsSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <TextSkeleton className="w-40" />
      <ButtonSkeleton size="sm" className="w-32" />
    </div>
  );
}

/** Mirrors NextActionCard (callout under the track). */
export function NextActionSkeleton() {
  return (
    <div className="flex flex-wrap justify-between items-center gap-3 bg-primary/10 dark:bg-primary/20 mt-3 px-4 py-3 rounded-xl">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-primary-ink text-xs">
          Prossima azione
        </span>
        <TextSkeleton lineClassName="h-6" className="w-48" />
      </div>
      <ButtonSkeleton size="sm" className="w-28" />
    </div>
  );
}

/** Placeholder of a tab while its data loads. */
export function ApplicationTabSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="rounded-lg w-full h-9" />
      <Card>
        <CardContent className="flex flex-col gap-3">
          <TextSkeleton className="w-56" />
          <TextSkeleton className="w-full" />
          <TextSkeleton className="w-2/3" />
        </CardContent>
      </Card>
    </div>
  );
}
