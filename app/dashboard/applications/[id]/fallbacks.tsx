import {
  BadgeSkeleton,
  ButtonSkeleton,
  PageHeaderSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors ApplicationHeader: header with badges, stepper and owner row. */
export function ApplicationHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton
        section="applications"
        titleClassName="w-72 max-w-full"
        description
        info={
          <>
            <BadgeSkeleton className="w-20" />
            <TextSkeleton className="w-20" />
            <TextSkeleton className="w-20" />
          </>
        }
        actions={<ButtonSkeleton size="sm" className="w-28" />}
      />
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 7 }, (_, i) => (
          <TextSkeleton key={i} className="w-20" />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <TextSkeleton className="w-40" />
        <ButtonSkeleton size="sm" className="w-32" />
      </div>
    </div>
  );
}

/** Mirrors NextActionCard. */
export function NextActionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm">
          Prossima azione
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <TextSkeleton lineClassName="h-7" className="w-48 h-5" />
        <ButtonSkeleton size="sm" className="w-28" />
      </CardContent>
    </Card>
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
