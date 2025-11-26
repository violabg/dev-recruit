import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deletePosition } from "@/lib/actions/positions";
import { getAllPositions, getPositionById } from "@/lib/data/positions";
import { formatDate } from "@/lib/utils";
import { Edit } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { Suspense } from "react";
import Candidates from "./components/candidates";
import Quizes from "./components/quizes";

export async function generateStaticParams() {
  const positions = await getAllPositions();

  // Pre-render only the last 100 positions for faster builds
  return positions.slice(0, 100).map((position) => ({
    id: position.id,
  }));
}

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="w-full h-10" />}>
        <PositionDetail params={params} />
      </Suspense>
    </div>
  );
}

async function PositionDetail({ params }: { params: Promise<{ id: string }> }) {
  "use cache";
  cacheLife("hours");
  const { id } = await params; // Await the params object
  cacheTag(`positions-${id}`);

  const position = await getPositionById(id);

  if (!position) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px]">
        <p className="font-medium text-lg">Posizione non trovata</p>
        <Button className="mt-4" asChild size="sm">
          <Link href="/dashboard/positions">Torna alle posizioni</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-3xl">{position.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{position.experienceLevel}</Badge>
            {position.contractType && (
              <Badge variant="outline">{position.contractType}</Badge>
            )}
            <span className="text-muted-foreground text-sm">
              Creata il {formatDate(position.createdAt.toISOString())}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild size="sm">
            <Link href={`/dashboard/positions/${position.id}/edit`}>
              <Edit className="mr-1 w-4 h-4" />
              Modifica
            </Link>
          </Button>
          <DeleteWithConfirm
            deleteAction={deletePosition.bind(null, position.id)}
            description="Questa azione non può essere annullata. Verranno eliminati anche tutti i quiz e i candidati associati a questa posizione."
            errorMessage="Errore durante l'eliminazione della posizione"
          />
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Dettagli</TabsTrigger>
          <TabsTrigger value="quizzes">Quiz</TabsTrigger>
          <TabsTrigger value="candidates">Candidati</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-4 pt-4">
          <div className="gap-4 grid md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Descrizione</CardTitle>
              </CardHeader>
              <CardContent>
                {position.description ? (
                  <p className="whitespace-pre-line">{position.description}</p>
                ) : (
                  <p className="text-muted-foreground">
                    Nessuna descrizione disponibile
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Competenze tecniche</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {position.skills.map((skill, index) => (
                      <Badge key={index}>{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {position.softSkills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Soft skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {position.softSkills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-4 pt-4">
          <Suspense fallback={<Skeleton className="w-full h-8" />}>
            <Quizes id={position.id} />
          </Suspense>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4 pt-4">
          <Suspense fallback={<Skeleton className="w-full h-8" />}>
            <Candidates id={position.id} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
