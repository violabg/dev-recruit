"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  evaluateAnswer,
  generateOverallEvaluation,
} from "@/lib/actions/evaluations";
import { Question } from "@/lib/schemas";
import { prismLanguage } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface InterviewResultsClientProps {
  interviewId: string;
  quizQuestions: Question[];
  answers: Record<string, any>;
  candidateName: string;
}

export function InterviewResultsClient({
  quizQuestions,
  answers,
  candidateName,
}: InterviewResultsClientProps) {
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState<Record<string, any>>({});
  const [overallEvaluation, setOverallEvaluation] = useState<any | null>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [currentEvaluationIndex, setCurrentEvaluationIndex] = useState(0);
  const [totalQuestionsToEvaluate, setTotalQuestionsToEvaluate] = useState(0);
  const [currentQuestionTitle, setCurrentQuestionTitle] = useState<string>("");
  const [isGeneratingOverallEvaluation, setIsGeneratingOverallEvaluation] =
    useState(false);
  const [isPending, startTransition] = useTransition();

  const evaluateAnswers = async () => {
    setLoading(true);
    try {
      const evaluatedQuestions: Record<string, any> = {};
      let totalScore = 0;
      let maxPossibleScore = 0;

      // Get questions that have answers
      const questionsToEvaluate = quizQuestions.filter((q) => answers[q.id]);
      setTotalQuestionsToEvaluate(questionsToEvaluate.length);
      setCurrentEvaluationIndex(0);

      // Evaluate each question
      for (let i = 0; i < questionsToEvaluate.length; i++) {
        const question = questionsToEvaluate[i];
        setCurrentEvaluationIndex(i + 1);
        setCurrentQuestionTitle(
          question.question.slice(0, 60) +
            (question.question.length > 60 ? "..." : "")
        );

        let answer = "";
        switch (question.type) {
          case "multiple_choice":
            const options = question.options || [];
            const answerIndex = parseInt(answers[question.id]);
            answer = options[answerIndex];
            break;
          case "code_snippet":
            answer = answers[question.id].code;
            break;
          case "open_question":
            answer = answers[question.id];
            break;
          default:
            console.error("Unknown question type:");
            continue;
        }
        const maxScore = 10; // Max score per question

        try {
          // Call the server action to evaluate the answer
          const result = await evaluateAnswer(question, answer);

          evaluatedQuestions[question.id] = {
            evaluation: result.evaluation,
            score: result.score,
            maxScore,
            strengths: result.strengths,
            weaknesses: result.weaknesses,
          };

          totalScore += result.score;
          maxPossibleScore += maxScore;
        } catch (error) {
          console.error("Error evaluating answer:", error);
          toast.error("Errore valutazione", {
            description: `Errore nella valutazione della domanda: ${question.question.slice(
              0,
              50
            )}...`,
          });
          evaluatedQuestions[question.id] = {
            evaluation:
              "Errore durante la valutazione automatica. La risposta verrà valutata manualmente.",
            score: 0,
            maxScore,
            strengths: [],
            weaknesses: ["Valutazione automatica non riuscita"],
          };
          maxPossibleScore += maxScore;
        }
      }

      setEvaluations(evaluatedQuestions);

      // Calculate overall score as percentage
      const percentageScore =
        maxPossibleScore > 0
          ? Math.round((totalScore / maxPossibleScore) * 100)
          : 0;
      setOverallScore(percentageScore);

      // Generate overall evaluation
      setIsGeneratingOverallEvaluation(true);
      setCurrentQuestionTitle("");
      try {
        const answeredQuestions = quizQuestions.filter((q) => answers[q.id]);

        const result = await generateOverallEvaluation(
          candidateName,
          answeredQuestions.length,
          quizQuestions.length,
          percentageScore,
          evaluatedQuestions
        );

        setOverallEvaluation(result);
      } catch (error) {
        console.error("Error generating overall evaluation:", error);
        toast.error("Errore valutazione complessiva", {
          description:
            "Non è stato possibile generare la valutazione complessiva automatica",
        });
        setOverallEvaluation({
          evaluation:
            "Non è stato possibile generare una valutazione complessiva automatica. Si prega di rivedere manualmente i risultati delle singole domande.",
        });
      }
    } catch (error) {
      console.error("Error in evaluation process:", error);
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
        answers[question.id] !== undefined &&
        parseInt(answers[question.id]) === question.correctAnswer
      ) {
        count++;
      }
    }
    return count;
  };

  const wrappedEvaluateAnswers = () => startTransition(evaluateAnswers);

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
              <Progress
                value={overallScore || 0}
                className={`h-2 ${
                  overallScore !== null
                    ? overallScore >= 70
                      ? "bg-green-500"
                      : overallScore >= 40
                      ? "bg-yellow-500"
                      : "bg-red-500"
                    : ""
                }`}
              />
              <div className="text-muted-foreground text-sm">
                {overallScore !== null ? `${overallScore}%` : "N/A"}
              </div>
            </div>
          </div>

          {!overallEvaluation && (
            <div className="space-y-4">
              <Button
                onClick={wrappedEvaluateAnswers}
                size="sm"
                disabled={
                  isPending || loading || getAnsweredQuestionsCount() === 0
                }
              >
                {loading ? (
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 w-4 h-4" />
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
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
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
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">
                  Valutazione complessiva AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="whitespace-pre-wrap">
                  {overallEvaluation.evaluation}
                </div>

                {overallEvaluation.strengths && (
                  <div>
                    <h4 className="mb-2 font-medium text-green-600 dark:text-green-400">
                      Punti di forza principali:
                    </h4>
                    <ul className="space-y-1 pl-5 list-disc">
                      {overallEvaluation.strengths.map(
                        (strength: any, idx: number) => (
                          <li key={idx}>{strength}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {overallEvaluation.weaknesses && (
                  <div>
                    <h4 className="mb-2 font-medium text-amber-600 dark:text-amber-400">
                      Aree di miglioramento:
                    </h4>
                    <ul className="space-y-1 pl-5 list-disc">
                      {overallEvaluation.weaknesses.map(
                        (weakness: any, idx: number) => (
                          <li key={idx}>{weakness}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {overallEvaluation.recommendation && (
                  <div className="bg-background mt-4 p-3 border rounded-md">
                    <h4 className="mb-1 font-medium">Raccomandazione:</h4>
                    <p>{overallEvaluation.recommendation}</p>
                    {overallEvaluation.fitScore && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-muted-foreground text-sm">
                          Punteggio di idoneità:
                        </span>
                        <div className="flex items-center">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-4 mx-0.5 rounded-sm ${
                                i < overallEvaluation.fitScore
                                  ? "bg-primary"
                                  : "bg-muted"
                              }`}
                            />
                          ))}
                          <span className="ml-2 font-medium">
                            {overallEvaluation.fitScore}/10
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tutte le domande</TabsTrigger>
          <TabsTrigger value="multiple_choice">Scelta multipla</TabsTrigger>
          <TabsTrigger value="open_question">Domande aperte</TabsTrigger>
          <TabsTrigger value="code_snippet">Snippet di codice</TabsTrigger>
        </TabsList>

        {["all", "multiple_choice", "open_question", "code_snippet"].map(
          (tabValue) => (
            <TabsContent
              key={tabValue}
              value={tabValue}
              className="space-y-4 pt-4"
            >
              {quizQuestions
                .filter((q) => tabValue === "all" || q.type === tabValue)
                .map((question, index) => {
                  const { id, question: questionText, type } = question;
                  const isAnswered = !!answers[id];
                  const evaluation = evaluations[id];

                  return (
                    <Card key={id}>
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
                              {type === "multiple_choice" && (
                                <div
                                  className={`rounded-md border p-3 ${
                                    Number.parseInt(answers[id]) ===
                                    question.correctAnswer
                                      ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                      : "border-red-500 bg-red-50 dark:bg-red-950/20"
                                  }`}
                                >
                                  {
                                    question.options[
                                      Number.parseInt(answers[id])
                                    ]
                                  }
                                </div>
                              )}

                              {type === "open_question" && (
                                <div className="p-3 border rounded-md whitespace-pre-wrap">
                                  {answers[id]}
                                </div>
                              )}

                              {type === "code_snippet" && (
                                <Highlight
                                  theme={themes.vsDark}
                                  code={answers[id].code}
                                  language={prismLanguage(
                                    question.language ?? "javascript"
                                  )}
                                >
                                  {({
                                    className,
                                    style,
                                    tokens,
                                    getLineProps,
                                    getTokenProps,
                                  }) => (
                                    <pre
                                      className={
                                        "p-4 rounded-lg font-mono text-sm bg-[oklch(0.18_0.02_260)] text-[oklch(0.95_0_0)] border border-[oklch(0.3_0.02_260)] " +
                                        className
                                      }
                                      style={style}
                                    >
                                      <code className="wrap-break-word whitespace-pre-wrap">
                                        {tokens.map((line, i) => {
                                          const { key: lineKey, ...lineProps } =
                                            getLineProps({
                                              line,
                                              key: i,
                                            });
                                          return (
                                            <div
                                              key={String(lineKey)}
                                              {...lineProps}
                                            >
                                              {line.map((token, key) => {
                                                const {
                                                  key: tokenKey,
                                                  ...rest
                                                } = getTokenProps({
                                                  token,
                                                  key,
                                                });
                                                return (
                                                  <span
                                                    key={String(tokenKey)}
                                                    {...rest}
                                                  />
                                                );
                                              })}
                                            </div>
                                          );
                                        })}
                                      </code>
                                    </pre>
                                  )}
                                </Highlight>
                              )}
                            </div>

                            {type === "multiple_choice" && (
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
                                <div className="font-medium">
                                  Valutazione AI:
                                </div>
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
                                          )
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
                                          )
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
          )
        )}
      </Tabs>
    </div>
  );
}
