"use client";
import { InterviewComplete } from "@/components/recruting/interview-complete";
import { InterviewQuestion } from "@/components/recruting/interview-question";
import { InterviewTimer } from "@/components/recruting/interview-timer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  completeInterview,
  startInterview,
  submitAnswer,
} from "@/lib/actions/interviews";
import { Quiz } from "@/lib/data/quizzes";
import { BrainCircuit } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "../theme-toggle";

type InterviewAnswer = string | { code: string } | null;

type InterviewRecord = {
  token: string;
  status: "pending" | "in_progress" | "completed";
  answers: Record<string, InterviewAnswer> | null;
  startedAt: string | null;
};

type Candidate = {
  id: string;
  name: string;
  email: string;
};

/**
 * Calculate remaining time in seconds based on startedAt and timeLimit
 * Returns null if no time limit, 0 if time expired
 * Never returns more than the total time limit
 */
function calculateRemainingTime(
  startedAt: string | null,
  timeLimitMinutes: number | null
): number | null {
  if (!timeLimitMinutes) return null;

  const totalSeconds = timeLimitMinutes * 60;

  // If not started yet, return null (timer shouldn't show)
  if (!startedAt) return null;

  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - startTime) / 1000);
  const remaining = totalSeconds - elapsedSeconds;

  // Clamp between 0 and totalSeconds
  return Math.max(0, Math.min(remaining, totalSeconds));
}

/**
 * Find the index of the first unanswered question
 * Returns 0 if all questions are answered or no questions exist
 */
function findFirstUnansweredQuestionIndex(
  questions: { id: string }[],
  answers: Record<string, InterviewAnswer> | null
): number {
  if (!answers || questions.length === 0) return 0;

  for (let i = 0; i < questions.length; i++) {
    if (answers[questions[i].id] === undefined) {
      return i;
    }
  }
  // All answered, go to last question
  return questions.length - 1;
}

export function InterviewClient({
  interview,
  quiz,
  candidate,
}: {
  interview: InterviewRecord;
  quiz: Quiz;
  candidate: Candidate;
}) {
  // Calculate initial question index - resume to first unanswered question if interview in progress
  const initialQuestionIndex =
    interview.status === "in_progress"
      ? findFirstUnansweredQuestionIndex(quiz.questions, interview.answers)
      : 0;

  const [currentQuestionIndex, setCurrentQuestionIndex] =
    useState(initialQuestionIndex);
  const [answers, setAnswers] = useState<Record<string, InterviewAnswer>>(
    interview.answers ? { ...interview.answers } : {}
  );
  const [pendingAnswer, setPendingAnswer] = useState<InterviewAnswer>(null);
  const handlePendingAnswerChange = useCallback((answer: InterviewAnswer) => {
    setPendingAnswer(answer);
  }, []);

  // Calculate remaining time from startedAt if interview is in progress
  // Note: We compute this during render but defer side effects to useEffect
  const initialTimeRemaining = calculateRemainingTime(
    interview.startedAt,
    quiz.timeLimit
  );

  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    initialTimeRemaining
  );
  // Initialize isTimeExpired based on initial remaining time
  const [isTimeExpired, setIsTimeExpired] = useState(
    () => initialTimeRemaining !== null && initialTimeRemaining === 0
  );
  const [isCompleted, setIsCompleted] = useState(
    interview.status === "completed"
  );
  const [isStarted, setIsStarted] = useState(
    interview.status === "in_progress"
  );
  const [isPending, startTransition] = useTransition();

  const handleCompleteInterview = useCallback(() => {
    startTransition(async () => {
      try {
        await completeInterview(interview.token);
        setIsCompleted(true);
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Impossibile completare l'intervista";
        toast.error("Errore", { description: message });
      }
    });
  }, [interview.token]);

  // Calculate remaining time from startedAt if interview is in progress
  // Note: We compute this during render but defer side effects to useEffect
  const handleStartInterview = () => {
    startTransition(async () => {
      try {
        const result = await startInterview(interview.token);
        setIsStarted(true);
        // Calculate remaining time from server's startedAt timestamp
        if (quiz.timeLimit && result.startedAt) {
          const remaining = calculateRemainingTime(
            result.startedAt,
            quiz.timeLimit
          );
          setTimeRemaining(remaining);
          if (remaining === 0) {
            setIsTimeExpired(true);
          }
        }
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Impossibile avviare l'intervista";
        toast.error("Errore", { description: message });
      }
    });
  };

  const handleAnswer = (questionId: string, answer: InterviewAnswer) => {
    // Optimistically update UI, then submit via transition
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
    startTransition(async () => {
      try {
        await submitAnswer(interview.token, questionId, answer);
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Impossibile salvare la risposta";
        toast.error("Errore", { description: message });
      }
    });
  };

  const handleSaveAndNext = () => {
    // Block navigation if time expired
    if (isTimeExpired) {
      toast.error("Tempo scaduto", {
        description: "Il tempo a disposizione è terminato.",
      });
      return;
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    if (pendingAnswer !== null) {
      handleAnswer(currentQuestion.id, pendingAnswer);
    }
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleSaveAndComplete = () => {
    const currentQuestion = quiz.questions[currentQuestionIndex];
    if (pendingAnswer !== null && !answers[currentQuestion.id]) {
      // Save the pending answer first, then complete
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: pendingAnswer,
      }));
      startTransition(async () => {
        try {
          await submitAnswer(
            interview.token,
            currentQuestion.id,
            pendingAnswer
          );
          await completeInterview(interview.token);
          setIsCompleted(true);
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : "Impossibile completare l'intervista";
          toast.error("Errore", { description: message });
        }
      });
    } else {
      handleCompleteInterview();
    }
  };

  if (isCompleted) {
    return <InterviewComplete />;
  }

  if (!isStarted) {
    return (
      <div className="flex flex-col justify-center items-center p-4 min-h-dvh">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex justify-center items-center gap-2 text-primary">
              <BrainCircuit className="w-6 h-6" />
              <h2 className="font-bold text-xl">DevRecruit AI</h2>
            </div>
            <CardTitle className="text-2xl text-center">
              Benvenuto al colloquio tecnico
            </CardTitle>
            <CardDescription className="text-center">
              Stai per iniziare il quiz per la posizione di{" "}
              {quiz.positions?.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">Dettagli del quiz</h3>
              <div className="space-y-2 mt-2 text-sm">
                <div className="flex justify-between">
                  <span>Titolo:</span>
                  <span className="font-medium">{quiz.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Numero di domande:</span>
                  <span className="font-medium">{quiz.questions.length}</span>
                </div>
                {quiz.timeLimit && (
                  <div className="flex justify-between">
                    <span>Limite di tempo:</span>
                    <span className="font-medium">{quiz.timeLimit} minuti</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">Istruzioni</h3>
              <ul className="space-y-2 mt-2 text-sm">
                <li>• Leggi attentamente ogni domanda prima di rispondere</li>
                <li>
                  • Puoi navigare tra le domande utilizzando i pulsanti
                  avanti/indietro
                </li>
                <li>• Le tue risposte vengono salvate automaticamente</li>
                {quiz.timeLimit && (
                  <li>
                    • Hai {quiz.timeLimit} minuti per completare il quiz,
                    dopodiché verrà inviato automaticamente
                  </li>
                )}
                <li>
                  • Clicca su &quot;Completa&quot; quando hai finito di
                  rispondere a tutte le domande
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 border border-yellow-200 dark:border-yellow-900 rounded-lg">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-300">
                Importante
              </h3>
              <p className="mt-1 text-yellow-800 dark:text-yellow-300 text-sm">
                Non chiudere o aggiornare questa pagina durante il quiz. Farlo
                potrebbe causare la perdita delle tue risposte.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={handleStartInterview}
              disabled={isPending}
            >
              Inizia il quiz
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  const totalQuestions = quiz.questions.length;
  const totalAnswers = Object.keys(answers).length;
  return (
    <div className="flex flex-col min-h-dvh">
      <header className="top-0 z-10 sticky bg-background border-b">
        <div className="flex justify-between items-center m-auto h-16 container">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <span className="font-bold">DevRecruit AI</span>
          </div>
          <div className="flex items-center gap-4">
            <InterviewTimer
              timeRemaining={timeRemaining}
              isStarted={isStarted}
              isCompleted={isCompleted}
              isTimeExpired={isTimeExpired}
              onTimeExpired={() => {
                setIsTimeExpired(true);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCompleteInterview}
              disabled={isPending}
            >
              Completa
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <div className="space-y-2 mb-6">
            <h1 className="font-bold text-2xl">{quiz.title}</h1>
            <div className="flex justify-between items-center">
              <div className="text-muted-foreground text-sm">
                Domanda {currentQuestionIndex + 1} di {quiz.questions.length}
              </div>
              <div className="font-medium text-sm">{candidate.name}</div>
            </div>
            <Progress
              value={((currentQuestionIndex + 1) / quiz.questions.length) * 100}
              className="h-2"
            />
          </div>

          {quiz.questions[currentQuestionIndex] && (
            <InterviewQuestion
              question={quiz.questions[currentQuestionIndex]}
              questionNumber={currentQuestionIndex + 1}
              onAnswerChange={handlePendingAnswerChange}
              currentAnswer={answers[quiz.questions[currentQuestionIndex].id]}
            />
          )}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
            >
              Precedente
            </Button>
            {currentQuestionIndex < totalQuestions - 1 ? (
              <Button
                onClick={handleSaveAndNext}
                disabled={
                  pendingAnswer === null &&
                  !answers[quiz.questions[currentQuestionIndex].id]
                }
              >
                Successiva
              </Button>
            ) : (
              <Button
                onClick={handleSaveAndComplete}
                disabled={
                  (pendingAnswer === null &&
                    !answers[quiz.questions[currentQuestionIndex].id]) ||
                  totalQuestions !==
                    totalAnswers +
                      (pendingAnswer !== null &&
                      !answers[quiz.questions[currentQuestionIndex].id]
                        ? 1
                        : 0) ||
                  isPending
                }
              >
                Completa quiz
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
