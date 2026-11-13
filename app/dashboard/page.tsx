import { SECTIONS, type SectionKey } from "@/components/dashboard/sections";
import PageHeader, { SectionTile } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getCandidatesCount,
  getCompletedInterviewsCount,
  getPositionsCount,
  getRecentPositions,
} from "@/lib/data/dashboard";
import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { RecentPositionsSkeleton, StatValueSkeleton } from "./fallbacks";

const STAT_CARDS: {
  section: SectionKey;
  label: string;
  caption: string;
  href: string;
}[] = [
  {
    section: "positions",
    label: "Posizioni aperte",
    caption: "Posizioni attualmente aperte",
    href: SECTIONS.positions.href,
  },
  {
    section: "candidates",
    label: "Candidati",
    caption: "Candidati totali nel sistema",
    href: SECTIONS.candidates.href,
  },
  {
    section: "interviews",
    label: "Colloqui completati",
    caption: "Colloqui conclusi",
    href: `${SECTIONS.interviews.href}?status=completed`,
  },
];

/** Linked stat: the whole tile navigates to its section. */
function StatCard({
  stat,
  value,
}: {
  stat: (typeof STAT_CARDS)[number];
  value: React.ReactNode;
}) {
  return (
    <Link
      href={stat.href as never}
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="flex-row items-center gap-4 px-4 h-full group-hover:ring-primary/50 transition-[box-shadow]">
        <SectionTile section={stat.section} />
        <div className="flex-1 min-w-0">
          <p className="text-muted-foreground text-sm truncate" title={stat.label}>
            {stat.label}
          </p>
          {value}
        </div>
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </Card>
    </Link>
  );
}

async function Stat({
  stat,
  load,
}: {
  stat: (typeof STAT_CARDS)[number];
  load: () => Promise<number>;
}) {
  const count = await load();
  return (
    <StatCard
      stat={stat}
      value={
        <p className="font-semibold tabular-nums text-2xl leading-8">
          {count || 0}
        </p>
      }
    />
  );
}

async function RecentPositions() {
  const positions = await getRecentPositions(5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Posizioni recenti</CardTitle>
        <CardDescription>Le ultime cinque posizioni create</CardDescription>
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
          <ul className="border rounded-lg divide-y">
            {positions.map((position) => (
              <li key={position.id}>
                <Link
                  href={`/dashboard/positions/${position.id}`}
                  className="group flex items-center gap-3 hover:bg-muted/60 focus-visible:bg-muted/60 px-3 py-2.5 focus-visible:outline-none transition-colors"
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
          <div className="flex flex-col justify-center items-center gap-3 border border-dashed rounded-lg h-35">
            <p className="text-muted-foreground text-sm">
              Nessuna posizione ancora. Crea la prima per iniziare.
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

const LOADERS = [getPositionsCount, getCandidatesCount, getCompletedInterviewsCount];

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Panoramica"
        description="Posizioni, candidati e colloqui a colpo d'occhio"
        actionBtns={
          <Link
            href="/dashboard/positions/new"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            <Plus className="mr-1 size-4" />
            Nuova posizione
          </Link>
        }
      />

      <div className="gap-4 grid md:grid-cols-3">
        {STAT_CARDS.map((stat, i) => (
          <Suspense
            key={stat.section}
            fallback={
              <StatCard stat={stat} value={<StatValueSkeleton />} />
            }
          >
            <Stat stat={stat} load={LOADERS[i]} />
          </Suspense>
        ))}
      </div>

      <Suspense fallback={<RecentPositionsSkeleton />}>
        <RecentPositions />
      </Suspense>
    </div>
  );
}
