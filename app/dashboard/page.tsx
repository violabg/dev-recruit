import {
  InterviewPipeline,
  InterviewPipelineSkeleton,
} from "@/components/dashboard/interview-pipeline";
import { SECTIONS, type SectionKey } from "@/components/dashboard/sections";
import PageHeader from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getCandidatesCount,
  getInteviewsStatus,
  getPositionsCount,
  getRecentPositions,
} from "@/lib/data/dashboard";
import { cn } from "@/lib/utils";
import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { RecentPositionsSkeleton, StatValueSkeleton } from "./fallbacks";

async function Pipeline() {
  const counts = await getInteviewsStatus();
  return <InterviewPipeline counts={counts} />;
}

const ARCHIVE: {
  section: SectionKey;
  label: string;
  load: () => Promise<number>;
}[] = [
  { section: "positions", label: "Posizioni aperte", load: getPositionsCount },
  { section: "candidates", label: "Candidati in archivio", load: getCandidatesCount },
];

async function Count({ load }: { load: () => Promise<number> }) {
  const n = await load();
  return (
    <span className="font-display font-bold text-heading text-2xl tabular-nums leading-8 tracking-[-0.02em]">
      {n || 0}
    </span>
  );
}

/** Compact linked rows: section icon, label, count. */
function Archive() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Archivio</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="-mx-2">
          {ARCHIVE.map(({ section, label, load }) => {
            const { icon: Icon, text, href } = SECTIONS[section];
            return (
              <li key={section}>
                <Link
                  href={href as never}
                  className="group flex items-center gap-3 hover:bg-muted/70 focus-visible:bg-muted/70 px-2 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  <Icon className={cn("size-4 shrink-0", text)} />
                  <span className="flex-1 min-w-0 truncate">{label}</span>
                  <Suspense fallback={<StatValueSkeleton />}>
                    <Count load={load} />
                  </Suspense>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

async function RecentPositions() {
  const positions = await getRecentPositions(5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Posizioni recenti</CardTitle>
        <CardAction>
          <Link
            href="/dashboard/positions"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Vedi tutte
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {positions.length > 0 ? (
          <ul className="-mx-2">
            {positions.map((position) => (
              <li key={position.id}>
                <Link
                  href={`/dashboard/positions/${position.id}`}
                  className="group flex items-center gap-3 hover:bg-muted/70 focus-visible:bg-muted/70 px-2 py-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{position.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {position.experienceLevel ?? "Esperienza non indicata"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col justify-center items-start gap-3 bg-muted/60 px-4 py-5 rounded-lg">
            <p className="text-muted-foreground text-sm">
              Nessuna posizione ancora. Crea la prima per generare quiz e
              invitare candidati.
            </p>
            <Link
              href="/dashboard/positions/new"
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              <Plus className="mr-1 size-4" />
              Crea posizione
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Panoramica"
        description="Lo stato della selezione: dove si trova ogni candidato e cosa aspetta una tua azione."
        actionBtns={
          <Link
            href="/dashboard/positions/new"
            className={buttonVariants({ variant: "default" })}
          >
            <Plus className="mr-1 size-4" />
            Nuova posizione
          </Link>
        }
      />

      <Suspense fallback={<InterviewPipelineSkeleton />}>
        <Pipeline />
      </Suspense>

      <div className="items-start gap-6 grid lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<RecentPositionsSkeleton />}>
            <RecentPositions />
          </Suspense>
        </div>
        <Archive />
      </div>
    </div>
  );
}
