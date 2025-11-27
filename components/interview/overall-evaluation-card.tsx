"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OverallEvaluation {
  evaluation?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendation?: string;
  fitScore?: number;
}

interface OverallEvaluationCardProps {
  overallEvaluation: OverallEvaluation;
}

export function OverallEvaluationCard({
  overallEvaluation,
}: OverallEvaluationCardProps) {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Valutazione complessiva AI</CardTitle>
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
              {overallEvaluation.strengths.map((strength: any, idx: number) => (
                <li key={idx}>{strength}</li>
              ))}
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
                        i < (overallEvaluation.fitScore ?? 0)
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
  );
}
