"use client";

import { CodeHighlight } from "@/components/quiz/code-highlight";
import { OverallEvaluationCard } from "@/components/recruting/overall-evaluation-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { updateEvaluationNotes } from "@/lib/actions/evaluation-entity";
import {
  completeInterviewEvaluationAction,
  evaluateInterviewAnswerAction,
} from "@/lib/actions/evaluations";
import type { EvaluationWithRelations } from "@/lib/data/evaluations";
import type { EvaluationResult, SavedQuestion } from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { Loader2, Save, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type QuestionEvaluation = EvaluationResult & { maxScore: number };

/** Mirrors the server rule: an empty answer is not evaluated */
const hasAnswer = (rawAnswer: unknown) => {
  if (rawAnswer === undefined || rawAnswer === null || rawAnswer === "") {
    return false;
  }
  if (typeof rawAnswer === "object" && "code" in rawAnswer) {
    return Boolean((rawAnswer as { code: unknown }).code);
  }
  return true;
};

interface InterviewResultsClientProps {
  interviewId: string;
  quizQuestions: SavedQuestion[];
  answers: Record<string, any>;
  candidateName: string;
  initialEvaluation?: EvaluationWithRelations | null;
}

export function InterviewResultsClient({
  interviewId,
  quizQuestions,
  answers,
  candidateName,
  initialEvaluation,
}: InterviewResultsClientProps) {
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState<
    Record<string, QuestionEvaluation>
  >({});
  const [savedEvaluation, setSavedEvaluation] = useState<{
    id: string;
    notes: string | null;
  } | null>(
    initialEvaluation
      ? { id: initialEvaluation.id, notes: initialEvaluation.notes }
      : null,
  );
  const [overallEvaluation, setOverallEvaluation] = useState<any | null>(
    initialEvaluation
      ? {
          evaluation: initialEvaluation.evaluation,
          strengths: initialEvaluation.strengths,
          weaknesses: initialEvaluation.weaknesses,
          recommendation: initialEvaluation.recommendation,
          fitScore: initialEvaluation.fitScore,
        }
      : null,
  );
  // Note: overallScore is the quiz percentage score (from evaluating answers)
  // This is different from fitScore which is the AI's candidate fit assessment
  // quizScore is persisted in the database for interview evaluations
  const [overallScore, setOverallScore] = useState<number | null>(
    (initialEvaluation as any)?.quizScore ?? null,
  );
  const [currentEvaluationIndex, setCurrentEvaluationIndex] = useState(0);
  const [totalQuestionsToEvaluate, setTotalQuestionsToEvaluate] = useState(0);
  const [currentQuestionTitle, setCurrentQuestionTitle] = useState<string>("");
  const [isGeneratingOverallEvaluation, setIsGeneratingOverallEvaluation] =
    useState(false);
  const [notes, setNotes] = useState(initialEvaluation?.notes ?? "");
  const [isSavingNotes, startSavingNotes] = useTransition();

  const evaluateAnswers = async () => {
    setLoading(true);
    try {
      const evaluatedQuestions: Record<string, QuestionEvaluation> = {};

      // Every answered question is evaluated, whatever its type
      const questionsToEvaluate = quizQuestions.filter((q) =>
        hasAnswer(answers[q.dbId]),
      );
      setTotalQuestionsToEvaluate(questionsToEvaluate.length);
      setCurrentEvaluationIndex(0);

      // One request per question keeps the progress indicator accurate.
      // The server reads the question and the answer itself.
      for (let i = 0; i < questionsToEvaluate.length; i++) {
        const question = questionsToEvaluate[i];
        setCurrentEvaluationIndex(i + 1);
        setCurrentQuestionTitle(
          question.question.slice(0, 60) +
            (question.question.length > 60 ? "..." : ""),
        );

        try {
          evaluatedQuestions[question.dbId] = unwrap(
            await evaluateInterviewAnswerAction(interviewId, question.dbId),
          ).evaluation;
        } catch {
          toast.error("Errore valutazione", {
            description: `Errore nella valutazione della domanda: ${question.question.slice(
              0,
              50,
            )}...`,
          });
          evaluatedQuestions[question.dbId] = {
            evaluation:
              "Errore durante la valutazione automatica. La risposta verrà valutata manualmente.",
            score: 0,
            maxScore: 10,
            strengths: [],
            weaknesses: ["Valutazione automatica non riuscita"],
          };
        }
      }

      setEvaluations(evaluatedQuestions);

      // Overall evaluation: generated, scored and saved on the server
      setIsGeneratingOverallEvaluation(true);
      setCurrentQuestionTitle("");
      try {
        const result = unwrap(
          await completeInterviewEvaluationAction({
            interviewId,
            questionEvaluations: evaluatedQuestions,
          }),
        );

        setOverallScore(result.quizScore);
        // fitScore: 0-100 (AI output) to 0-10 (display scale)
        setOverallEvaluation({
          ...result.overall,
          fitScore: Math.round(result.overall.fitScore / 10),
        });
        setSavedEvaluation({ id: result.evaluationId, notes: null });
        toast.success("Valutazione salvata con successo");
      } catch (error) {
        toast.error("Errore valutazione complessiva", {
          description: errorMessage(
            error,
            "Non è stato possibile generare la valutazione complessiva automatica",
          ),
        });
        setOverallEvaluation({
          evaluation:
            "Non è stato possibile generare una valutazione complessiva automatica. Si prega di rivedere manualmente i risultati delle singole domande.",
        });
      }
    } catch {
      toast.error("Errore", {
        description:
          "Si è verificato un errore durante la valutazione delle risposte",
      });
    } finally {
      setLoading(false);
      // Reset progress indicators
      setCurrentEvaluationIndex(0);
      setTotalQuestionsToEvaluate(0);
      setCurrentQuestionTitle("");
      setIsGeneratingOverallEvaluation(false);
    }
  };

  const getAnsweredQuestionsCount = () => {
    return Object.keys(answers).length;
  };

  const getCorrectAnswersCount = () => {
    let count = 0;
    for (const question of quizQuestions) {
      if (
        question.type === "multiple_choice" &&
        answers[question.dbId] !== undefined
      ) {
        const answerIdx = Number.parseInt(String(answers[question.dbId]), 10);
        if (!isNaN(answerIdx) && answerIdx === question.correctAnswer) {
          count++;
        }
      }
    }
    return count;
  };

  const handleSaveNotes = () => {
    if (!savedEvaluation) return;

    startSavingNotes(async () => {
      try {
        unwrap(await updateEvaluationNotes(savedEvaluation.id, notes));
        toast.success("Note salvate con successo");
      } catch (error) {
        toast.error(
          errorMessage(error, "Errore durante il salvataggio delle note"),
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Riepilogo risultati</CardTitle>
          <CardDescription>
            {candidateName} ha completato {getAnsweredQuestionsCount()} di{" "}
            {quizQuestions.length} domande
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="gap-4 grid md:grid-cols-3">
            <div className="space-y-2">
              <div className="font-medium text-sm">Completamento</div>
              <Progress
                value={
                  (getAnsweredQuestionsCount() / quizQuestions.length) * 100
                }
                className="h-2"
              />
              <div className="text-muted-foreground text-sm">
                {getAnsweredQuestionsCount()} di {quizQuestions.length} domande
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium text-sm">
                Risposte corrette (scelta multipla)
              </div>
              <Progress
                value={
                  (getCorrectAnswersCount() /
                    quizQuestions.filter((q) => q.type === "multiple_choice")
                      .length) *
                  100
                }
                className="h-2"
              />
              <div className="text-muted-foreground text-sm">
                {getCorrectAnswersCount()} di{" "}
                {
                  quizQuestions.filter((q) => q.type === "multiple_choice")
                    .length
                }{" "}
                domande
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium text-sm">Punteggio complessivo</div>
              <ProgressPrimitive.Root
                value={overallScore || 0}
                data-slot="progress"
                className="flex flex-wrap gap-3 h-2"
              >
                <ProgressTrack
                  className={`${
                    overallScore !== null
                      ? overallScore >= 70
                        ? "bg-green-500"
                        : overallScore >= 40
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      : ""
                  }`}
                >
                  <ProgressIndicator />
                </ProgressTrack>
              </ProgressPrimitive.Root>

              <div className="text-muted-foreground text-sm">
                {overallScore !== null ? `${overallScore}%` : "N/A"}
              </div>
            </div>
          </div>

          {!overallEvaluation && (
            <div className="space-y-4">
              <Button
                onClick={evaluateAnswers}
                size="sm"
                disabled={loading || getAnsweredQuestionsCount() === 0}
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 size-4" />
                )}
                Valuta risposte con AI
              </Button>

              {loading && (
                <div className="space-y-2">
                  {!isGeneratingOverallEvaluation &&
                  totalQuestionsToEvaluate > 0 ? (
                    // Show individual question progress
                    <>
                      <div className="flex justify-between items-center text-muted-foreground text-sm">
                        <span>Valutazione in corso...</span>
                        <span>
                          {currentEvaluationIndex} di {totalQuestionsToEvaluate}
                        </span>
                      </div>
                      <Progress
                        value={
                          (currentEvaluationIndex / totalQuestionsToEvaluate) *
                          100
                        }
                        className="w-full"
                      />
                      {currentQuestionTitle && (
                        <p className="text-muted-foreground text-xs">
                          {currentQuestionTitle}
                        </p>
                      )}
                    </>
                  ) : (
                    // Show overall evaluation progress
                    <div className="flex items-center space-x-3">
                      <Loader2 className="size-4 text-primary animate-spin" />
                      <div className="text-muted-foreground text-sm">
                        Generazione valutazione complessiva...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {overallEvaluation && (
            <OverallEvaluationCard overallEvaluation={overallEvaluation} />
          )}

          {savedEvaluation && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="notes" className="font-medium text-sm">
                  Note manuali
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Aggiungi note personali o osservazioni sulla valutazione..."
                  rows={3}
                />
              </div>
              <Button
                onClick={handleSaveNotes}
                size="sm"
                disabled={
                  isSavingNotes || notes === (savedEvaluation.notes ?? "")
                }
              >
                {isSavingNotes ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Salva note
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tutte le domande</TabsTrigger>
          <TabsTrigger value="multiple_choice">Scelta multipla</TabsTrigger>
          <TabsTrigger value="open_question">Domande aperte</TabsTrigger>
          <TabsTrigger value="code_snippet">Snippet di codice</TabsTrigger>
          <TabsTrigger value="behavioral_scenario">
            Scenari comportamentali
          </TabsTrigger>
        </TabsList>

        {[
          "all",
          "multiple_choice",
          "open_question",
          "code_snippet",
          "behavioral_scenario",
        ].map((tabValue) => (
          <TabsContent
            key={tabValue}
            value={tabValue}
            className="space-y-4 pt-4"
          >
            {quizQuestions
              .filter((q) => tabValue === "all" || q.type === tabValue)
              .map((question, index) => {
                const { dbId, question: questionText, type } = question;
                const isAnswered = !!answers[dbId];
                const evaluation = evaluations[dbId];

                return (
                  <Card key={dbId}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                          {index + 1}. {questionText}
                        </CardTitle>
                        {evaluation && (
                          <div
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              evaluation.score >= 7
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : evaluation.score >= 4
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {evaluation.score}/{evaluation.maxScore}
                          </div>
                        )}
                      </div>
                      <CardDescription>
                        {type === "multiple_choice"
                          ? "Risposta multipla"
                          : type === "open_question"
                            ? "Domanda aperta"
                            : "Snippet di codice"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isAnswered ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="font-medium">
                              Risposta del candidato:
                            </div>
                            {type === "multiple_choice" &&
                              question.options &&
                              (() => {
                                const answerIdx = Number.parseInt(
                                  String(answers[dbId]),
                                  10,
                                );
                                const isValidIdx =
                                  !isNaN(answerIdx) &&
                                  answerIdx >= 0 &&
                                  answerIdx < question.options.length;
                                const selectedOption = isValidIdx
                                  ? question.options[answerIdx]
                                  : null;
                                const isCorrectAnswer =
                                  isValidIdx &&
                                  answerIdx === question.correctAnswer;

                                return (
                                  <div
                                    className={`rounded-md border p-3 ${
                                      isCorrectAnswer
                                        ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                        : "border-red-500 bg-red-50 dark:bg-red-950/20"
                                    }`}
                                  >
                                    {selectedOption ?? "Risposta non valida"}
                                  </div>
                                );
                              })()}

                            {(type === "open_question" ||
                              type === "behavioral_scenario") && (
                              <div className="p-3 border rounded-md whitespace-pre-wrap">
                                {String(answers[dbId] ?? "")}
                              </div>
                            )}

                            {type === "code_snippet" && (
                              <CodeHighlight
                                code={
                                  typeof answers[dbId] === "object" &&
                                  answers[dbId] !== null &&
                                  "code" in answers[dbId]
                                    ? answers[dbId].code
                                    : String(answers[dbId] ?? "")
                                }
                                language={question.language ?? "javascript"}
                                className="bg-[oklch(0.18_0.02_260)] p-4 border border-[oklch(0.3_0.02_260)] rounded-lg font-mono text-[oklch(0.95_0_0)] text-sm"
                              />
                            )}
                          </div>

                          {type === "multiple_choice" &&
                            question.options &&
                            question.correctAnswer !== undefined &&
                            question.correctAnswer >= 0 &&
                            question.correctAnswer <
                              question.options.length && (
                              <div className="space-y-2">
                                <div className="font-medium">
                                  Risposta corretta:
                                </div>
                                <div className="bg-green-50 dark:bg-green-950/20 p-3 border border-green-500 rounded-md">
                                  {question.options[question.correctAnswer]}
                                </div>
                                {question.explanation && (
                                  <div className="text-muted-foreground text-sm">
                                    {question.explanation}
                                  </div>
                                )}
                              </div>
                            )}

                          {evaluation && (
                            <div className="space-y-2">
                              <div className="font-medium">Valutazione AI:</div>
                              <div className="p-3 border rounded-md whitespace-pre-wrap">
                                {evaluation.evaluation}
                              </div>

                              {evaluation.strengths &&
                                evaluation.strengths.length > 0 && (
                                  <div className="mt-2">
                                    <div className="font-medium text-green-600 dark:text-green-400">
                                      Punti di forza:
                                    </div>
                                    <ul className="space-y-1 mt-1 pl-5 list-disc">
                                      {evaluation.strengths.map(
                                        (strength: any, idx: number) => (
                                          <li key={idx} className="text-sm">
                                            {strength}
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}

                              {evaluation.weaknesses &&
                                evaluation.weaknesses.length > 0 && (
                                  <div className="mt-2">
                                    <div className="font-medium text-amber-600 dark:text-amber-400">
                                      Aree di miglioramento:
                                    </div>
                                    <ul className="space-y-1 mt-1 pl-5 list-disc">
                                      {evaluation.weaknesses.map(
                                        (weakness: any, idx: number) => (
                                          <li key={idx} className="text-sm">
                                            {weakness}
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          Nessuna risposta
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
