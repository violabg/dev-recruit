import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInterviewsByQuiz } from "@/lib/data/interviews";
import { formatDate } from "@/lib/utils";
import { Eye, Link2 } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export async function QuizResultsContent({ params }: Props) {
  const { id: quizId } = await params;
  const interviews = await getInterviewsByQuiz(quizId);

  if (interviews.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[200px]">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Nessun candidato ha ancora completato questo quiz
          </p>
          <Button className="mt-2" size="sm" asChild>
            <Link href={`/dashboard/quizzes/${quizId}/invite`}>
              <Link2 className="mr-1 size-4" />
              Associa a candidati
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="p-2 font-semibold text-left">Candidato</th>
              <th className="p-2 font-semibold text-left">Email</th>
              <th className="p-2 font-semibold text-left">Stato</th>
              <th className="p-2 font-semibold text-left">Data Creazione</th>
              <th className="p-2 font-semibold text-left">Data Inizio</th>
              <th className="p-2 font-semibold text-left">
                Data Completamento
              </th>
              <th className="p-2 font-semibold text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {interviews.map((interview) => (
              <tr
                key={interview.id}
                className="hover:bg-muted/50 border-b transition-colors"
              >
                <td className="p-2">
                  <Link
                    href={`/dashboard/interviews/${interview.id}`}
                    className="text-primary hover:underline"
                  >
                    {interview.candidateName}
                  </Link>
                </td>
                <td className="p-2 text-muted-foreground">
                  {interview.candidateEmail}
                </td>
                <td className="p-2">
                  <Badge
                    variant={
                      interview.status === "completed"
                        ? "default"
                        : interview.status === "started"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {interview.status === "completed"
                      ? "Completato"
                      : interview.status === "started"
                      ? "Iniziato"
                      : "Assegnato"}
                  </Badge>
                </td>
                <td className="p-2 text-muted-foreground text-xs">
                  {formatDate(interview.createdAt)}
                </td>
                <td className="p-2 text-muted-foreground text-xs">
                  {interview.startedAt ? formatDate(interview.startedAt) : "—"}
                </td>
                <td className="p-2 text-muted-foreground text-xs">
                  {interview.completedAt
                    ? formatDate(interview.completedAt)
                    : "—"}
                </td>
                <td className="p-2 text-center">
                  <Button variant="ghost" size="icon" asChild>
                    <Link
                      href={`/dashboard/candidates/${interview.candidateId}`}
                    >
                      <Eye className="size-4 text-primary" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
