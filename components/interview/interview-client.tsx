"use client";

import { Quiz } from "@/app/dashboard/quizzes/quizzes-actions";
import { InterviewComplete } from "@/components/interview/interview-complete";
import { InterviewQuestion } from "@/components/interview/interview-question";
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
import { BrainCircuit, Clock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "../theme-toggle";

type InterviewAnswer = string | { code: string } | null;

type InterviewRecord = {
  token: string;
  status: "pending" | "in_progress" | "completed";
  answers: Record<string, InterviewAnswer> | null;
};

type Candidate = {
  id: string;
  name: string;
  email: string;
};

export function InterviewClient({
  interview,
  quiz,
  candidate,
}: {
  interview: InterviewRecord;
  quiz: Quiz;
  candidate: Candidate;
}) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, InterviewAnswer>>(
    interview.answers ? { ...interview.answers } : {}
  );
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    quiz.time_limit ? quiz.time_limit * 60 : null
  );
  const [isCompleted, setIsCompleted] = useState(
    interview.status === "completed"
  );
  const [isStarted, setIsStarted] = useState(
    interview.status === "in_progress"
  );

  const handleCompleteInterview = useCallback(async () => {
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
  }, [interview.token]);

  useEffect(() => {
    // Timer for time limit
    if (!timeRemaining || !isStarted || isCompleted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleCompleteInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isStarted, isCompleted, handleCompleteInterview]);

  const handleStartInterview = async () => {
    try {
      await startInterview(interview.token);
      setIsStarted(true);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Impossibile avviare l'intervista";
      toast.error("Errore", { description: message });
    }
  };

  const handleAnswer = async (questionId: string, answer: InterviewAnswer) => {
    try {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: answer,
      }));

      await submitAnswer(interview.token, questionId, answer);

      if (currentQuestionIndex < quiz.questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Impossibile salvare la risposta";
      toast.error("Errore", { description: message });
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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
                {quiz.time_limit && (
                  <div className="flex justify-between">
                    <span>Limite di tempo:</span>
                    <span className="font-medium">
                      {quiz.time_limit} minuti
                    </span>
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
                {quiz.time_limit && (
                  <li>
                    • Hai {quiz.time_limit} minuti per completare il quiz,
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
            <Button className="w-full" onClick={handleStartInterview}>
              Inizia il quiz
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  const totalQuestions = quiz.questions.length;
  const totalAnswers = Object.keys(answers).length;
  const completed = totalQuestions === totalAnswers;
  return (
    <div className="flex flex-col min-h-dvh">
      <header className="top-0 z-10 sticky bg-background border-b">
        <div className="flex justify-between items-center m-auto h-16 container">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <span className="font-bold">DevRecruit AI</span>
          </div>
          <div className="flex items-center gap-4">
            {timeRemaining !== null && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono">
                  {formatTimeRemaining(timeRemaining)}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCompleteInterview}
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
              completed={completed}
              onAnswer={(answer) =>
                handleAnswer(quiz.questions[currentQuestionIndex].id, answer)
              }
              currentAnswer={answers[quiz.questions[currentQuestionIndex].id]}
            />
          )}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0 || completed}
            >
              Precedente
            </Button>
            {currentQuestionIndex < totalQuestions - 1 ? (
              <Button
                onClick={() =>
                  setCurrentQuestionIndex(currentQuestionIndex + 1)
                }
                disabled={!answers[quiz.questions[currentQuestionIndex].id]}
              >
                Successiva
              </Button>
            ) : (
              <Button
                onClick={handleCompleteInterview}
                disabled={totalQuestions !== totalAnswers}
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
