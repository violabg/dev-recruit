"use client";

import { CodeHighlight } from "@/components/quiz/code-highlight";
import { BlockLabel, Stat, StatGrid } from "@/components/detail-blocks";
import { OverallEvaluationCard } from "@/components/recruiting/overall-evaluation-card";
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
import { updateEvaluationNotesAction } from "@/lib/actions/evaluation-entity";
import {
  completeAssessmentEvaluationAction,
  evaluateAssessmentAnswerAction,
  recalculateAnswerEvaluationsAction,
} from "@/lib/actions/evaluations";
import type { EvaluationWithRelations } from "@/lib/data/evaluations";
import type { EvaluationResult, SavedQuestion } from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { cn } from "cn";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
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

interface AssessmentResultsClientProps {
  assessmentId: string;
  quizQuestions: SavedQuestion[];
  answers: Record<string, any>;
  candidateName: string;
  initialEvaluation?: EvaluationWithRelations | null;
}

export function AssessmentResultsClient({
  assessmentId,
  quizQuestions,
  answers,
  candidateName,
  initialEvaluation,
}: AssessmentResultsClientProps) {
  const [loading, setLoading] = useState(false);
  // Seeded from the saved per-answer detail. Its narrative text is not
  // stored: it exists only for answers evaluated in this session.
  const [evaluations, setEvaluations] = useState<
    Record<string, QuestionEvaluation>
  >(() =>
    Object.fromEntries(
      Object.entries(initialEvaluation?.answerEvaluations ?? {}).map(
        ([questionId, detail]) => [
          questionId,
          {
            evaluation: "",
            score: detail.score,
            strengths: detail.strengths,
            weaknesses: detail.weaknesses,
            maxScore: 10,
          },
        ],
      ),
    ),
  );
  const [isRecalculating, startRecalculating] = useTransition();
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
  // quizScore is persisted in the database for assessment evaluations
  const [overallScore, setOverallScore] = useState<number | null>(
    initialEvaluation?.quizScore ?? null,
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
            await evaluateAssessmentAnswerAction(assessmentId, question.dbId),
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
          await completeAssessmentEvaluationAction({
            assessmentId,
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

  // Answered questions of a saved evaluation that have no stored detail
  // (evaluations saved before the per-answer detail existed)
  const answeredQuestions = quizQuestions.filter((q) =>
    hasAnswer(answers[q.dbId]),
  );
  const missingDetail =
    savedEvaluation !== null &&
    answeredQuestions.some((q) => !evaluations[q.dbId]);

  // "Ricalcola dettaglio risposte": re-scores every answered question and
  // stores only the per-answer detail. quizScore, fitScore and the overall
  // evaluation are not touched.
  const recalculateAnswerDetail = () => {
    startRecalculating(async () => {
      const successful: Record<string, QuestionEvaluation> = {};
      let failed = 0;

      setTotalQuestionsToEvaluate(answeredQuestions.length);
      setCurrentEvaluationIndex(0);

      try {
        for (let i = 0; i < answeredQuestions.length; i++) {
          const question = answeredQuestions[i];
          setCurrentEvaluationIndex(i + 1);
          setCurrentQuestionTitle(
            question.question.slice(0, 60) +
              (question.question.length > 60 ? "..." : ""),
          );

          // A failed answer is skipped and counted: no fallback score is
          // stored as if it were real detail
          try {
            successful[question.dbId] = unwrap(
              await evaluateAssessmentAnswerAction(assessmentId, question.dbId),
            ).evaluation;
          } catch {
            failed++;
          }
        }

        if (Object.keys(successful).length === 0) {
          toast.error("Nessuna risposta è stata valutata. Riprova.");
          return;
        }

        unwrap(
          await recalculateAnswerEvaluationsAction({
            assessmentId,
            questionEvaluations: successful,
          }),
        );

        setEvaluations((previous) => ({ ...previous, ...successful }));
        if (failed > 0) {
          toast.warning(`${failed} risposte non sono state valutate. Riprova.`);
        } else {
          toast.success("Dettaglio risposte ricalcolato");
        }
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        setCurrentEvaluationIndex(0);
        setTotalQuestionsToEvaluate(0);
        setCurrentQuestionTitle("");
      }
    });
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
        unwrap(await updateEvaluationNotesAction(savedEvaluation.id, notes));
        toast.success("Note salvate con successo");
      } catch (error) {
        toast.error(
          errorMessage(error, "Errore durante il salvataggio delle note"),
        );
      }
    });
  };

  const multipleChoiceCount = quizQuestions.filter((q) => q.type === "multiple_choice").length;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Riepilogo risultati</CardTitle>
          <CardDescription>
            {candidateName} ha completato {getAnsweredQuestionsCount()} di{" "}
            {quizQuestions.length} domande
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <StatGrid>
            <Stat
              value={`${getAnsweredQuestionsCount()}/${quizQuestions.length}`}
              label="domande con risposta"
            />
            <Stat
              value={
                multipleChoiceCount > 0
                  ? `${getCorrectAnswersCount()}/${multipleChoiceCount}`
                  : "—"
              }
              label="corrette a scelta multipla"
            />
            <Stat
              value={overallScore !== null ? `${overallScore}%` : "—"}
              label="punteggio complessivo"
              tone={
                overallScore === null
                  ? undefined
                  : overallScore >= 70
                    ? "success"
                    : overallScore >= 40
                      ? "warning"
                      : "destructive"
              }
            />
            <Stat
              value={overallEvaluation ? "Fatta" : "Da fare"}
              label="valutazione AI"
              tone={overallEvaluation ? "success" : "warning"}
            />
          </StatGrid>

          {!overallEvaluation && (
            <div className="flex flex-col gap-4">
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
                <div className="flex flex-col gap-2">
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
                    <div className="flex items-center gap-3">
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
            <div className="flex flex-col gap-4 pt-4 border-t">
              <div className="flex flex-col gap-2">
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
                variant="outline"
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

      {missingDetail && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Il dettaglio per risposta non è disponibile per questa
              valutazione.
            </p>
            <div>
              <Button
                onClick={recalculateAnswerDetail}
                size="sm"
                variant="outline"
                disabled={isRecalculating || loading}
              >
                {isRecalculating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 size-4" />
                )}
                Ricalcola dettaglio risposte
              </Button>
            </div>
            {isRecalculating && totalQuestionsToEvaluate > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-muted-foreground text-sm">
                  <span>Valutazione in corso...</span>
                  <span>
                    {currentEvaluationIndex} di {totalQuestionsToEvaluate}
                  </span>
                </div>
                <Progress
                  value={
                    (currentEvaluationIndex / totalQuestionsToEvaluate) * 100
                  }
                  className="w-full"
                />
                {currentQuestionTitle && (
                  <p className="text-muted-foreground text-xs">
                    {currentQuestionTitle}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
            className="flex flex-col gap-4 pt-4"
          >
            {quizQuestions
              .filter((q) => tabValue === "all" || q.type === tabValue)
              .map((question, index) => {
                const { dbId, question: questionText, type } = question;
                const isAnswered = !!answers[dbId];
                const evaluation = evaluations[dbId];

                return (
                  <Card key={dbId}>
                    <CardHeader>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="mt-0.5 font-display font-bold text-muted-foreground text-sm tabular-nums">
                            {index + 1}.
                          </span>
                          <div className="flex flex-col gap-1 min-w-0">
                            <BlockLabel>
                              {type === "multiple_choice"
                                ? "Risposta multipla"
                                : type === "open_question"
                                  ? "Domanda aperta"
                                  : type === "behavioral_scenario"
                                    ? "Scenario comportamentale"
                                    : "Snippet di codice"}
                            </BlockLabel>
                            <CardTitle className="font-sans font-semibold text-foreground text-base leading-snug">
                              {questionText}
                            </CardTitle>
                          </div>
                        </div>
                        {evaluation ? (
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full font-semibold text-sm tabular-nums shrink-0",
                              evaluation.score >= 7
                                ? "bg-success/10 text-success"
                                : evaluation.score >= 4
                                  ? "bg-warning/10 text-warning"
                                  : "bg-destructive/10 text-destructive",
                            )}
                          >
                            {evaluation.score}/{evaluation.maxScore}
                          </span>
                        ) : !isAnswered ? (
                          <span className="bg-muted px-2.5 py-1 rounded-full text-muted-foreground text-xs shrink-0">
                            Senza risposta
                          </span>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      {isAnswered ? (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <BlockLabel>Risposta del candidato</BlockLabel>
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
                                    className={cn(
                                      "rounded-md border p-3",
                                      isCorrectAnswer
                                        ? "border-success bg-success/10"
                                        : "border-destructive bg-destructive/10",
                                    )}
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
                              />
                            )}
                          </div>

                          {type === "multiple_choice" &&
                            question.options &&
                            question.correctAnswer !== undefined &&
                            question.correctAnswer >= 0 &&
                            question.correctAnswer <
                              question.options.length && (
                              <div className="flex flex-col gap-2">
                                <BlockLabel>Risposta corretta</BlockLabel>
                                <div className="bg-success/10 p-3 border border-success rounded-md">
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
                            <div className="flex flex-col gap-2">
                              {evaluation.evaluation && (
                                <>
                                  <BlockLabel>Valutazione AI</BlockLabel>
                                  <div className="p-3 border rounded-md whitespace-pre-wrap">
                                    {evaluation.evaluation}
                                  </div>
                                </>
                              )}

                              {evaluation.strengths &&
                                evaluation.strengths.length > 0 && (
                                  <div className="mt-2">
                                    <div className="font-medium text-success">
                                      Punti di forza:
                                    </div>
                                    <ul className="flex flex-col gap-1 mt-1 pl-5 list-disc">
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
                                    <div className="font-medium text-warning">
                                      Aree di miglioramento:
                                    </div>
                                    <ul className="flex flex-col gap-1 mt-1 pl-5 list-disc">
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
