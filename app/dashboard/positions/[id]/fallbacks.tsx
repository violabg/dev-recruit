import {
  BadgeSkeleton,
  ButtonSkeleton,
  PageHeaderSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Mirrors PositionHeader: title, level/contract badges + date, edit/delete. */
export function PositionHeaderSkeleton() {
  return (
    <PageHeaderSkeleton
        section="positions"
      info={
        <>
          <BadgeSkeleton className="w-16" />
          <BadgeSkeleton className="w-20" />
          <TextSkeleton className="w-36" />
        </>
      }
      actions={
        <>
          <ButtonSkeleton size="sm" className="w-24" />
          <ButtonSkeleton size="sm" />
        </>
      }
    />
  );
}

/** Mirrors PositionDetailsContent: description card | skills cards. */
export function PositionDetailsSkeleton() {
  return (
    <div className="gap-4 grid md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Descrizione</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <TextSkeleton lineClassName="h-6" className="w-full h-4" />
            <TextSkeleton lineClassName="h-6" className="w-full h-4" />
            <TextSkeleton lineClassName="h-6" className="w-11/12 h-4" />
            <TextSkeleton lineClassName="h-6" className="w-3/4 h-4" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Competenze tecniche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {["w-16", "w-20", "w-14", "w-24", "w-16"].map((w, i) => (
                <BadgeSkeleton key={i} className={w} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Soft skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {["w-20", "w-24", "w-16"].map((w, i) => (
                <BadgeSkeleton key={i} className={w} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Shared shape of the "Quiz" and "Candidati" tabs: section heading + sm
 * button, then a md:2-col grid of cards (title, meta row, two sm buttons).
 * Rendered as a fragment because the TabsContent already applies space-y-4.
 */
function PositionTabCardsSkeleton({
  title,
  actionClassName,
  metaRight,
}: {
  title: string;
  actionClassName: string;
  metaRight: React.ReactNode;
}) {
  return (
    <>
      <div className="flex justify-between">
        <h2 className="font-semibold text-heading text-xl">{title}</h2>
        <ButtonSkeleton size="sm" className={actionClassName} />
      </div>
      <div className="gap-4 grid md:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <TextSkeleton lineClassName="h-7" className="w-48 h-5" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <TextSkeleton className="w-28" />
                  {metaRight}
                </div>
                <div className="flex justify-between">
                  <ButtonSkeleton size="sm" className="w-24" />
                  <ButtonSkeleton size="sm" className="w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export function PositionQuizzesSkeleton() {
  return (
    <PositionTabCardsSkeleton
      title="Quiz"
      actionClassName="w-24"
      metaRight={<TextSkeleton className="w-32" />}
    />
  );
}

export function PositionCandidatesSkeleton() {
  return (
    <PositionTabCardsSkeleton
      title="Candidati"
      actionClassName="w-40"
      metaRight={<BadgeSkeleton className="w-20" />}
    />
  );
}
