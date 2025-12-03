"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { OverallEvaluation } from "@/lib/schemas";
import { Loader2 } from "lucide-react";

interface StreamingEvaluationCardProps {
  streamingEvaluation: Partial<OverallEvaluation>;
  streamingPositionTitle: string | null;
}

export function StreamingEvaluationCard({
  streamingEvaluation,
  streamingPositionTitle,
}: StreamingEvaluationCardProps) {
  return (
    <Card className="py-0 border-primary/50">
      <CardHeader className="gap-0 p-0">
        <div className="flex items-center">
          <div className="flex flex-1 items-center gap-3 p-6 text-left">
            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-primary text-lg">
                {streamingPositionTitle}
              </CardTitle>
              <CardDescription>Generazione in corso...</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        {/* Evaluation text */}
        <div className="space-y-2">
          <h4 className="font-medium text-muted-foreground text-sm">
            Valutazione
          </h4>
          {streamingEvaluation.evaluation ? (
            <p className="text-sm whitespace-pre-wrap">
              {streamingEvaluation.evaluation}
              <span className="inline-block bg-primary ml-0.5 w-1 h-4 animate-pulse" />
            </p>
          ) : (
            <Skeleton className="w-full h-20" />
          )}
        </div>

        {/* Strengths */}
        <div className="space-y-2">
          <h4 className="font-medium text-green-600 dark:text-green-400 text-sm">
            Punti di forza
          </h4>
          {streamingEvaluation.strengths &&
          streamingEvaluation.strengths.length > 0 ? (
            <ul className="space-y-1 pl-5 text-sm list-disc">
              {streamingEvaluation.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2">
              <Skeleton className="w-3/4 h-4" />
              <Skeleton className="w-2/3 h-4" />
            </div>
          )}
        </div>

        {/* Weaknesses */}
        <div className="space-y-2">
          <h4 className="font-medium text-amber-600 dark:text-amber-400 text-sm">
            Aree di miglioramento
          </h4>
          {streamingEvaluation.weaknesses &&
          streamingEvaluation.weaknesses.length > 0 ? (
            <ul className="space-y-1 pl-5 text-sm list-disc">
              {streamingEvaluation.weaknesses.map((weakness, idx) => (
                <li key={idx}>{weakness}</li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2">
              <Skeleton className="w-3/4 h-4" />
              <Skeleton className="w-2/3 h-4" />
            </div>
          )}
        </div>

        {/* Recommendation */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Raccomandazione</h4>
          {streamingEvaluation.recommendation ? (
            <p className="text-sm">{streamingEvaluation.recommendation}</p>
          ) : (
            <Skeleton className="w-full h-12" />
          )}
        </div>

        {/* Fit Score */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-muted-foreground text-sm">
            Punteggio di idoneità:
          </span>
          {streamingEvaluation.fitScore !== undefined ? (
            <div className="flex items-center">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-4 mx-0.5 rounded-sm ${
                    i < Math.round(streamingEvaluation.fitScore! / 10)
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                />
              ))}
              <span className="ml-2 font-medium">
                {Math.round(streamingEvaluation.fitScore / 10)}/10
              </span>
            </div>
          ) : (
            <Skeleton className="w-32 h-4" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StreamingEvaluationCard;
