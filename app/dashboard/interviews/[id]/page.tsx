import { InterviewExpiryChecker } from "@/components/interviews/interview-expiry-checker";
import { InterviewResults } from "@/components/recruting/interview-results";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Tabs removed — rendering results directly
import { getEvaluationByInterviewId } from "@/lib/data/evaluations";
import {
  getInterviewDetail,
  getRecentInterviewIds,
} from "@/lib/data/interviews";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export async function generateStaticParams() {
  const interviewIds = await getRecentInterviewIds(100);

  // Cache Components requires at least one result from generateStaticParams
  // Return a placeholder that will result in 404 at runtime if no interviews exist
  if (interviewIds.length === 0) {
    return [{ id: "placeholder" }];
  }

  return interviewIds.map((id) => ({ id }));
}

// Calculate duration helper - only computes when both dates are available
function calculateDuration(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationMs = end.getTime() - start.getTime();
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = await params;
  const [interviewData, evaluation] = await Promise.all([
    getInterviewDetail(unwrappedParams.id),
    getEvaluationByInterviewId(unwrappedParams.id),
  ]);

  if (!interviewData) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px]">
        <p className="font-medium text-lg">Intervista non trovata</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/quizzes">Torna ai quiz</Link>
        </Button>
      </div>
    );
  }

  const { interview, quiz, candidate } = interviewData;

  return (
    <div className="space-y-6">
      {/* Client-side expiry checker - only triggers for in_progress interviews */}
      <InterviewExpiryChecker
        interviewId={interview.id}
        status={interview.status}
        startedAt={interview.startedAt}
        timeLimit={quiz.timeLimit}
      />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/quizzes/${quiz.id}`}>
            <ArrowLeft className="mr-1 size-4" />
            Torna al quiz
          </Link>
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-3xl">Intervista: {quiz.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">
              {quiz.positions?.title ?? "Senza ruolo"}
            </Badge>
            <Badge
              variant={
                interview.status === "pending"
                  ? "outline"
                  : interview.status === "cancelled"
                  ? "destructive"
                  : interview.status === "completed"
                  ? "default"
                  : interview.status === "in_progress"
                  ? "secondary"
                  : "outline"
              }
            >
              {interview.status === "pending"
                ? "In attesa"
                : interview.status === "cancelled"
                ? "Annullato"
                : interview.status === "completed"
                ? "Completato"
                : interview.status === "in_progress"
                ? "In corso"
                : interview.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="gap-4 grid md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Candidato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div>
                <div className="font-medium">
                  {candidate.name ?? "Nome non disponibile"}
                </div>
                <div className="text-muted-foreground text-sm">
                  {candidate.email ?? "Email non disponibile"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Stato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Inizio:</span>
                <span>{formatDate(interview.startedAt, true)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Fine:</span>
                <span>{formatDate(interview.completedAt, true)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Durata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span>
                {calculateDuration(
                  interview.startedAt,
                  interview.completedAt
                ) ?? (interview.status === "in_progress" ? "In corso" : "N/A")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 pt-4">
        {interview.status === "completed" ? (
          <InterviewResults
            interviewId={interview.id}
            quizQuestions={quiz.questions}
            answers={interview.answers || {}}
            candidateName={candidate.name ?? ""}
            initialEvaluation={evaluation}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Risultati non disponibili</CardTitle>
              <CardDescription>
                L&apos;intervista non è ancora stata completata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                I risultati saranno disponibili una volta che il candidato avrà
                completato il quiz.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
