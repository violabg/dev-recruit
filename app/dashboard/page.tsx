import { Button } from "@/components/ui/button";
import {
  Card,
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
import { BarChart3, Briefcase, Plus, Users } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardStatsSkeleton, RecentPositionsSkeleton } from "./fallbacks";

// Server component for dashboard stats
async function OpenPositions() {
  "use cache";
  cacheLife("hours");
  cacheTag("positions");

  const positionsCount = await getPositionsCount();

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="flex flex-row justify-between items-center pb-2">
        <CardTitle className="font-medium text-sm">Posizioni Aperte</CardTitle>
        <Briefcase className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">{positionsCount || 0}</div>
        <p className="text-muted-foreground text-xs">
          Posizioni attualmente aperte
        </p>
      </CardContent>
    </Card>
  );
}
async function Candidates() {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates");
  const candidatesCount = await getCandidatesCount();

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="flex flex-row justify-between items-center pb-2">
        <CardTitle className="font-medium text-sm">Candidati</CardTitle>
        <Users className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">{candidatesCount || 0}</div>
        <p className="text-muted-foreground text-xs">
          Candidati totali nel sistema
        </p>
      </CardContent>
    </Card>
  );
}
async function Interviews() {
  "use cache";
  cacheLife("hours");
  cacheTag("interviews");
  const interviewsCount = await getCompletedInterviewsCount();

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="flex flex-row justify-between items-center pb-2">
        <CardTitle className="font-medium text-sm">
          Colloqui Completati
        </CardTitle>
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">{interviewsCount || 0}</div>
        <p className="text-muted-foreground text-xs">
          Colloqui completati con successo
        </p>
      </CardContent>
    </Card>
  );
}

// Server component for recent positions
async function RecentPositions() {
  "use cache";
  cacheLife("hours");
  cacheTag("positions");
  const positions = await getRecentPositions(5);

  return (
    <Card className="col-span-1 hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle>Posizioni Recenti</CardTitle>
        <CardDescription>Le ultime posizioni create</CardDescription>
      </CardHeader>
      <CardContent>
        {positions.length > 0 ? (
          <div className="space-y-2">
            {positions.map((position) => (
              <div
                key={position.id}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{position.title}</div>
                  <div className="text-muted-foreground text-sm">
                    {position.experienceLevel ?? "Esperienza non indicata"}
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/positions/${position.id}`}>
                    Dettagli
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[140px]">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                Nessuna posizione creata
              </p>
              <Button className="mt-2" size="sm" asChild>
                <Link href="/dashboard/positions/new">
                  <Plus className="mr-2 w-4 h-4" />
                  Crea posizione
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main dashboard page (server component)
export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-bold text-3xl">Dashboard</h1>
        <Button asChild variant={"default"}>
          <Link href="/dashboard/positions/new">
            <Plus className="mr-2 w-4 h-4" />
            Nuova Posizione
          </Link>
        </Button>
      </div>

      <div className="gap-4 grid md:grid-cols-3">
        {/* Stats cards */}
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <OpenPositions />
        </Suspense>
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <Candidates />
        </Suspense>
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <Interviews />
        </Suspense>
      </div>

      <div className="">
        {/* Recent positions */}
        <Suspense fallback={<RecentPositionsSkeleton />}>
          <RecentPositions />
        </Suspense>

        {/* <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Attività Recenti</CardTitle>
            <CardDescription>
              Le ultime attività sulla piattaforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[140px]">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">
                  Nessuna attività recente
                </p>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
