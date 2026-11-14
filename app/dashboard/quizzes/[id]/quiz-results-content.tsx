import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

import { getInterviewStatePresentation } from "@/components/interviews/interview-status";
import { getInterviewsByQuiz } from "@/lib/data/interviews";
import { formatDate } from "@/lib/utils";
import { Eye, Link2 } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

function InterviewStatusCell({ status }: { status: string }) {
  const { label, badge } = getInterviewStatePresentation(status);
  return <Badge className={badge}>{label}</Badge>;
}

export async function QuizResultsContent({ params }: Props) {
  const { id: quizId } = await params;
  const interviews = await getInterviewsByQuiz(quizId);

  if (interviews.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[200px]">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Questo quiz non è ancora stato assegnato a nessun candidato
          </p>
          <Link
            href={`/dashboard/quizzes/${quizId}/invite`}
            className={cn(
              "mt-2",
              buttonVariants({ variant: "default", size: "sm" }),
            )}
          >
            <Link2 className="mr-1 size-4" />
            Associa a candidati
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
                    href={`/dashboard/candidates/${interview.candidateId}`}
                    className="text-primary hover:underline"
                  >
                    {interview.candidateName}
                  </Link>
                </td>
                <td className="p-2 text-muted-foreground">
                  {interview.candidateEmail}
                </td>
                <td className="p-2">
                  <InterviewStatusCell status={interview.status} />
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
                  <Link
                    href={`/dashboard/interviews/${interview.id}`}
                    className={buttonVariants({
                      variant: "ghost",
                      size: "icon",
                    })}
                  >
                    <Eye className="size-4 text-primary" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
