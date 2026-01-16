import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCandidatesByPosition } from "@/lib/data/candidates";
import { Plus, Users } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Candidates({ params }: Props) {
  const { id } = await params;
  const candidates = await getCandidatesByPosition(id);

  return (
    <>
      <div className="flex justify-between">
        <h2 className="font-semibold text-xl">Candidati</h2>
        <Link
          href={`/dashboard/candidates/new?positionId=${id}`}
          className={`${buttonVariants({ variant: "default", size: "sm" })}`}
        >
          <Plus className="mr-1 size-4" />
          Aggiungi Candidato
        </Link>
      </div>

      {candidates.length > 0 ? (
        <div className="gap-4 grid md:grid-cols-2">
          {candidates.map((candidate) => (
            <Card key={candidate.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {candidate.firstName} {candidate.lastName}
                </CardTitle>
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
                    <Link
                      href={`/dashboard/candidates/${candidate.id}`}
                      className={`${buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}`}
                    >
                      Dettagli
                    </Link>

                    <Link
                      href={`/dashboard/candidates/${candidate.id}/quiz`}
                      className={`${buttonVariants({
                        variant: "secondary",
                        size: "sm",
                      })}`}
                    >
                      Associa quiz
                    </Link>
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
            <Link
              href={`/dashboard/candidates/new?positionId=${id}`}
              className={`${buttonVariants({
                variant: "default",
                size: "sm",
                className: "mt-2",
              })}`}
            >
              <Users className="mr-1 size-4" />
              Aggiungi candidato
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
