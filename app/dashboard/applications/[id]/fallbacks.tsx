import {
  ButtonSkeleton,
  PageHeaderSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors ApplicationHeader: band with the context line and the actions. */
export function ApplicationHeaderSkeleton() {
  return (
    <PageHeaderSkeleton
      titleClassName="w-72 max-w-full"
      info={<TextSkeleton className="w-96 max-w-full" />}
      actions={
        <>
          <ButtonSkeleton size="sm" className="w-32" />
          <ButtonSkeleton size="sm" className="w-28" />
          <OwnerControlsSkeleton />
        </>
      }
    />
  );
}

/** Mirrors OwnerControls in the application header. */
export function OwnerControlsSkeleton() {
  return <ButtonSkeleton size="sm" className="w-32" />;
}

/** Mirrors NextActionCard (callout of the current stop). */
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

/** Mirrors the story: five stop rows on their rail. */
export function StorySkeleton() {
  return (
    <div className="relative flex flex-col gap-3 before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-0.5 before:bg-border">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="relative pl-10">
          <span className="top-3 left-0 absolute bg-background border rounded-full size-[22px]" />
          <div className="items-center gap-4 grid grid-cols-[9rem_minmax(0,1fr)_auto] bg-card px-4 py-3 border rounded-xl">
            <TextSkeleton className="w-24" />
            <TextSkeleton className="w-2/3" />
            <ButtonSkeleton size="sm" className="w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mirrors ApplicationSide: Contatti and Altre candidature cards. */
export function SideSkeleton() {
  return (
    <div className="flex flex-[1_1_18rem] flex-col gap-4">
      {["Contatti", "Altre candidature"].map((title) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <TextSkeleton className="w-40" />
            <TextSkeleton className="w-32" />
            <Skeleton className="rounded-lg w-full h-8" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
