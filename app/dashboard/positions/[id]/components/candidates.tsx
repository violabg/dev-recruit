import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCandidatesByPosition } from "@/lib/data/candidates";
import { Plus, Users } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";

export default async function Candidates({ id }: { id: string }) {
  "use cache";
  cacheLife("hours");
  cacheTag(`positions-${id}`);
  const candidates = await getCandidatesByPosition(id);

  return (
    <>
      <div className="flex justify-between">
        <h2 className="font-semibold text-xl">Candidati</h2>
        <Button asChild size="sm" variant="default">
          <Link href={`/dashboard/candidates/new?positionId=${id}`}>
            Aggiungi Candidato
            <Plus className="ml-1 w-4 h-4" />
          </Link>
        </Button>
      </div>

      {candidates.length > 0 ? (
        <div className="gap-4 grid md:grid-cols-2">
          {candidates.map((candidate) => (
            <Card key={candidate.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{candidate.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {candidate.email}
                    </span>
                    <Badge
                      variant={
                        candidate.status === "pending"
                          ? "outline"
                          : candidate.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {candidate.status === "pending"
                        ? "In attesa"
                        : candidate.status === "completed"
                        ? "Completato"
                        : candidate.status === "invited"
                        ? "Invitato"
                        : candidate.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/candidates/${candidate.id}`}>
                        Dettagli
                      </Link>
                    </Button>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/dashboard/candidates/${candidate.id}/quiz`}>
                        Associa quiz
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[200px]">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Nessun candidato aggiunto per questa posizione
            </p>
            <Button className="mt-2" size="sm" asChild>
              <Link href={`/dashboard/candidates/new?positionId=${id}`}>
                <Users className="mr-1 w-4 h-4" />
                Aggiungi candidato
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
