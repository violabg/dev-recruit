import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

/**
 * Assessment pipeline: the test flow drawn like a build pipeline.
 * pending → in_progress → completed, with cancelled as a side branch.
 * A proportional bar shows the distribution; each stage links to the
 * filtered assessment list.
 */

type StageKey = "pending" | "in_progress" | "completed" | "cancelled";

const STAGES: {
  key: StageKey;
  label: string;
  caption: string;
  dot: string;
  bar: string;
}[] = [
  {
    key: "pending",
    label: "In attesa",
    caption: "Invito inviato, quiz non ancora iniziato",
    dot: "bg-stage-pending",
    bar: "bg-stage-pending",
  },
  {
    key: "in_progress",
    label: "In corso",
    caption: "Il candidato sta rispondendo",
    dot: "bg-stage-progress",
    bar: "bg-stage-progress",
  },
  {
    key: "completed",
    label: "Completati",
    caption: "Quiz consegnati, pronti da valutare",
    dot: "bg-stage-done",
    bar: "bg-stage-done",
  },
  {
    key: "cancelled",
    label: "Annullati",
    caption: "Inviti revocati",
    dot: "bg-stage-cancelled",
    bar: "bg-stage-cancelled",
  },
];

const FLOW = STAGES.slice(0, 3);
const BRANCH = STAGES[3];

function stageHref(key: StageKey) {
  return `/dashboard/assessments?status=${key}`;
}

function Stage({
  stage,
  value,
}: {
  stage: (typeof STAGES)[number];
  value: React.ReactNode;
}) {
  return (
    <Link
      href={stageHref(stage.key) as never}
      className="group flex flex-col gap-1 hover:bg-muted/70 focus-visible:bg-muted/70 -m-2 p-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0 transition-colors"
    >
      <span className="flex items-center gap-2 font-medium text-sm">
        <span aria-hidden className={cn("rounded-full size-2", stage.dot)} />
        {stage.label}
      </span>
      {value}
      <span className="text-muted-foreground text-xs leading-snug">
        {stage.caption}
      </span>
    </Link>
  );
}

function Connector() {
  return (
    <div
      aria-hidden
      className="hidden sm:flex items-center self-center text-border"
    >
      <span className="bg-current w-6 lg:w-10 h-px" />
      <ChevronRight className="-ml-1.5 size-4" />
    </div>
  );
}

const NUMBER_CLASS =
  "font-display font-bold text-[2.5rem] text-heading tabular-nums leading-none tracking-[-0.03em]";

function PipelineFrame({
  bar,
  total,
  renderValue,
}: {
  bar: React.ReactNode;
  total: React.ReactNode;
  renderValue: (key: StageKey) => React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="pipeline-title"
      className="bg-card shadow-[0_1px_2px_0_oklch(0.3_0.06_255/0.05)] p-5 md:p-6 rounded-xl ring-1 ring-border"
    >
      <div className="flex justify-between items-baseline gap-4 mb-4">
        <h2
          id="pipeline-title"
          className="font-display font-bold text-heading text-xl tracking-[-0.02em]"
        >
          Pipeline test
        </h2>
        <span className="text-muted-foreground text-sm">{total}</span>
      </div>

      {bar}

      <div className="flex sm:flex-row flex-col gap-6 sm:gap-3 mt-6">
        <div className="sm:flex sm:flex-row flex-[3] gap-x-4 gap-y-6 sm:gap-3 grid grid-cols-2">
          {FLOW.map((stage, i) => (
            <div key={stage.key} className="contents">
              {i > 0 && <Connector />}
              <div className="flex-1 min-w-0">
                <Stage stage={stage} value={renderValue(stage.key)} />
              </div>
            </div>
          ))}
        </div>
        <div className="sm:pl-6 pt-6 sm:pt-0 border-t sm:border-t-0 sm:border-l sm:w-48 shrink-0">
          <Stage stage={BRANCH} value={renderValue(BRANCH.key)} />
        </div>
      </div>
    </section>
  );
}

export function AssessmentPipeline({
  counts,
}: {
  counts: Partial<Record<string, number>>;
}) {
  const values = STAGES.map((s) => ({ ...s, n: counts[s.key] ?? 0 }));
  const total = values.reduce((sum, s) => sum + s.n, 0);

  const bar =
    total === 0 ? (
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3 bg-muted/60 px-4 py-3 rounded-lg">
        <p className="text-muted-foreground text-sm">
          Nessun test ancora. Invita un candidato partendo da un quiz.
        </p>
        <Link
          href="/dashboard/quizzes"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Vai ai quiz
        </Link>
      </div>
    ) : (
      <div
        role="img"
        aria-label={values.map((s) => `${s.label}: ${s.n}`).join(", ")}
        className="flex gap-0.5 rounded-full h-2.5 overflow-hidden"
      >
        {values
          .filter((s) => s.n > 0)
          .map((s, i) => (
            <span
              key={s.key}
              className={cn(
                "h-full origin-left motion-safe:animate-[pipeline-grow_700ms_cubic-bezier(0.2,0.7,0.2,1)_both]",
                s.bar
              )}
              style={{
                flexGrow: s.n,
                animationDelay: `${i * 90}ms`,
              }}
            />
          ))}
      </div>
    );

  return (
    <PipelineFrame
      bar={bar}
      total={`${total} test in totale`}
      renderValue={(key) => (
        <span className={NUMBER_CLASS}>
          {values.find((s) => s.key === key)?.n ?? 0}
        </span>
      )}
    />
  );
}

/** Suspense fallback: same frame, labels and captions; numbers are skeletons. */
export function AssessmentPipelineSkeleton() {
  return (
    <PipelineFrame
      bar={<Skeleton className="rounded-full h-2.5" />}
      total={<Skeleton className="inline-block w-28 h-3.5 align-middle" />}
      renderValue={() => (
        <span className="flex items-center h-10">
          <Skeleton className="w-10 h-8" />
        </span>
      )}
    />
  );
}
