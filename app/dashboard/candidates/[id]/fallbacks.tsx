import { FactStripSkeleton } from "@/components/detail-blocks";
import {
  BadgeSkeleton,
  ButtonSkeleton,
  PageHeaderSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Mirrors CandidateHeader (PageHeader with the stage badge + 4 actions). */
export function CandidateHeaderSkeleton() {
  return (
    <PageHeaderSkeleton
      info={
        <>
          <BadgeSkeleton className="w-20" />
          <TextSkeleton className="w-44" />
        </>
      }
      actions={
        <>
          <ButtonSkeleton className="w-28" />
          <ButtonSkeleton className="w-28" />
          <ButtonSkeleton className="w-24" />
          <ButtonSkeleton size="sm" />
        </>
      }
    />
  );
}

/** Mirrors CandidateDetailsContent: real labels, skeleton values. */
export function CandidateDetailsSkeleton() {
  return (
    <FactStripSkeleton
      labels={["Email", "Data di nascita", "Curriculum", "Ricontattabile"]}
    />
  );
}

/** Mirrors CandidateApplicationsContent rows (position, date, stage). */
export function CandidateApplicationsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidature</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }, (_, i) => (
            <div
              key={i}
              className="flex justify-between items-center pb-2 last:pb-0 border-b last:border-b-0"
            >
              <div>
                <TextSkeleton lineClassName="h-6" className="w-24 h-4" />
                <TextSkeleton className="w-36" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
