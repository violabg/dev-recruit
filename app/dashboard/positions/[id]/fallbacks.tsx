import {
  BadgeSkeleton,
  ButtonSkeleton,
  FieldSkeleton,
  PageHeaderSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PositionHeader: title, level/contract badges + date, edit/delete. */
export function PositionHeaderSkeleton() {
  return (
    <PageHeaderSkeleton
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

      <div className="flex flex-col gap-4">
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
 * Shared shape of the "Test" and "Candidati" tabs: section heading + sm
 * button, then a md:2-col grid of cards (title, meta row, two sm buttons).
 * Rendered as a fragment because the TabsContent already applies flex + gap.
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
        <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">{title}</h2>
        <ButtonSkeleton size="sm" className={actionClassName} />
      </div>
      <div className="gap-4 grid md:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <TextSkeleton lineClassName="h-7" className="w-48 h-5" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
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

/** Mirrors CoverageTable: heading, then the criteria rows. */
export function CoverageTableSkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">
        Copertura dei criteri
      </h2>
      <Card>
        <CardContent>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex justify-between items-center gap-4">
                <TextSkeleton className="w-48" />
                <TextSkeleton className="w-16" />
                <TextSkeleton className="w-16" />
                <TextSkeleton className="w-10" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

/** Mirrors CriteriaAndQuestions: criteria, coverage, tests, traces. */
export function CriteriaAndQuestionsSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <PositionScorecardSkeleton />
      <CoverageTableSkeleton />
      <PositionQuizzesSkeleton />
      <PositionGuidesSkeleton />
    </div>
  );
}

/** Mirrors ScorecardSummary: heading + button, then a category card. */
export function PositionScorecardSkeleton() {
  return (
    <>
      <div className="flex justify-between">
        <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">
          Criteri della posizione
        </h2>
        <ButtonSkeleton size="sm" className="w-36" />
      </div>
      <Card>
        <CardHeader>
          <TextSkeleton lineClassName="h-7" className="w-24 h-5" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <TextSkeleton className="w-40" />
                  <BadgeSkeleton className="w-24" />
                </div>
                <TextSkeleton className="w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function PositionGuidesSkeleton() {
  return (
    <PositionTabCardsSkeleton
      title="Tracce del colloquio"
      actionClassName="w-28"
      metaRight={<TextSkeleton className="w-20" />}
    />
  );
}

export function PositionQuizzesSkeleton() {
  return (
    <PositionTabCardsSkeleton
      title="Test"
      actionClassName="w-24"
      metaRight={<TextSkeleton className="w-32" />}
    />
  );
}

/**
 * Mirrors the scorecard editor page: page header, the
 * toolbar (model select, AI proposal, add) and a few criterion rows.
 */
export function ScorecardEditorSkeleton() {
  return (
    <>
      <PageHeaderSkeleton
        title="Criteri della posizione"
        description
        actions={<ButtonSkeleton size="sm" className="w-40" />}
      />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <ButtonSkeleton className="w-80" />
            <ButtonSkeleton className="w-48" />
          </div>
          <ButtonSkeleton className="w-40" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-4 p-4 border rounded-lg">
            <FieldSkeleton label="Nome" />
            <FieldSkeleton label="Descrizione" controlClassName="h-16" />
            <div className="gap-4 grid md:grid-cols-2">
              <FieldSkeleton label="Categoria" />
              <FieldSkeleton label="Priorità" />
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <ButtonSkeleton className="w-32" />
        </div>
      </div>
    </>
  );
}

/**
 * Mirrors the interview guide editor pages: page header, the guide fields
 * (title, round, duration), the toolbar and a few section cards.
 */
export function GuideEditorSkeleton() {
  return (
    <>
      <PageHeaderSkeleton
        description
        actions={
          <>
            <ButtonSkeleton size="sm" className="w-40" />
            <ButtonSkeleton size="sm" />
          </>
        }
      />
      <div className="flex flex-col gap-6">
        <div className="gap-4 grid md:grid-cols-[1fr_8rem_10rem]">
          <FieldSkeleton label="Titolo" />
          <FieldSkeleton label="Round" />
          <FieldSkeleton label="Durata (minuti)" />
        </div>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <TextSkeleton className="w-48" />
          <div className="flex gap-2">
            <ButtonSkeleton className="w-44" />
            <ButtonSkeleton className="w-40" />
          </div>
        </div>
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex flex-col gap-4 p-4 border rounded-lg">
            <div className="gap-4 grid md:grid-cols-[1fr_14rem_8rem]">
              <FieldSkeleton label="Titolo sezione" />
              <FieldSkeleton label="Tipo" />
              <FieldSkeleton label="Minuti" />
            </div>
            <Skeleton className="rounded-lg w-full h-40" />
            <ButtonSkeleton size="sm" className="w-36" />
          </div>
        ))}
        <div className="flex justify-end">
          <ButtonSkeleton className="w-32" />
        </div>
      </div>
    </>
  );
}

/** Mirrors Selection: heading, add button and a row of kanban columns. */
export function PositionSelectionSkeleton() {
  return (
    <>
      <div className="flex justify-between">
        <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">
          Candidati
        </h2>
        <ButtonSkeleton size="sm" className="w-40" />
      </div>
      <div className="flex gap-4 pb-2 overflow-x-auto">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 min-w-56 shrink-0">
            <TextSkeleton className="w-24" />
            <Skeleton className="rounded-lg w-full h-28" />
          </div>
        ))}
      </div>
    </>
  );
}

/** Mirrors the read-only guide: header, outline + criteria, section chapters. */
export function GuideViewSkeleton() {
  return (
    <>
      <PageHeaderSkeleton
        description
        actions={
          <>
            <ButtonSkeleton size="sm" className="w-32" />
            <ButtonSkeleton size="sm" className="w-40" />
            <ButtonSkeleton size="sm" />
          </>
        }
      />
      <div className="flex flex-col gap-8">
        <div className="items-start gap-6 grid xl:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="rounded-xl w-full h-72" />
          <Skeleton className="rounded-xl w-full h-72" />
        </div>
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <TextSkeleton className="w-56" />
            <Skeleton className="rounded-xl w-full h-48" />
          </div>
        ))}
      </div>
    </>
  );
}
