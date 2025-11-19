import { CandidateStatusBadge } from "@/components/candidates/candidate-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function CandidateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;

  const candidate = await prisma.candidate.findFirst({
    where: { id },
    include: {
      position: {
        select: {
          id: true,
          title: true,
          experienceLevel: true,
        },
      },
      interviews: {
        select: {
          id: true,
          status: true,
          score: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!candidate) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px]">
        <p className="font-medium text-lg">Candidato non trovato</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/candidates">Torna ai candidati</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-3xl">{candidate.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{candidate.status}</Badge>
            {candidate.position && (
              <Badge variant="secondary">{candidate.position.title}</Badge>
            )}
            <span className="text-muted-foreground text-sm">
              {candidate.email}
            </span>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/candidates">Torna ai candidati</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dettagli Candidato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gap-2 grid md:grid-cols-2">
            <div>
              <div className="font-semibold">Nome</div>
              <div>{candidate.name}</div>
            </div>
            <div>
              <div className="font-semibold">Email</div>
              <div>{candidate.email}</div>
            </div>
            <div>
              <div className="font-semibold">Stato</div>
              <CandidateStatusBadge status={candidate.status} />
            </div>
            <div>
              <div className="font-semibold">Posizione</div>
              <div>{candidate.position?.title || "-"}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      {candidate.interviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Colloqui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {candidate.interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="flex justify-between items-center pb-2 last:pb-0 border-b last:border-b-0"
                >
                  <div>
                    <div className="font-medium">{interview.status}</div>
                    {interview.createdAt && (
                      <div className="text-muted-foreground text-sm">
                        {new Date(interview.createdAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="font-semibold">
                    {interview.score !== null
                      ? `Punteggio: ${interview.score}`
                      : "-"}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
