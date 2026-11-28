"use client";

import StreamingEvaluationCard from "@/app/dashboard/candidates/[id]/evaluations/streaming-evaluation-card";
import { parsePartialEvaluation } from "@/app/dashboard/candidates/[id]/evaluations/streaming-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { syncResumeEvaluationAction } from "@/lib/actions/evaluations";
import type { ApplicationDetail } from "@/lib/data/applications";
import type { OverallEvaluation } from "@/lib/schemas";
import { unwrap } from "@/lib/utils/action-result";
import { cn } from "cn";
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CriteriaAssessmentList } from "./criteria-assessment-list";

/** Fit score tint on the 0–10 scale: ≥ 7 success, ≥ 4 warning, else destructive */
function scoreTint(value: number) {
  if (value >= 7) return "bg-success/10 text-success";
  if (value >= 4) return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
}

/**
 * CV tab: the resume of the candidate and its evaluation for this position.
 * Generating it streams from /api/evaluations/stream, which also moves the
 * application to screening.
 */
export function ResumeEvaluationPanel({
  candidateId,
  positionId,
  positionTitle,
  hasResume,
  resumeUrl,
  evaluation: initialEvaluation,
  primaryAction = false,
}: {
  candidateId: string;
  positionId: string;
  positionTitle: string;
  hasResume: boolean;
  resumeUrl: string | null;
  evaluation: ApplicationDetail["resumeEvaluation"];
  /** The panel holds the page's next step: its button is the primary one */
  primaryAction?: boolean;
}) {
  const router = useRouter();
  const [isStreaming, setIsStreaming] = useState(false);
  // The evaluation the stream route has stored: shown as soon as it comes
  // back from syncResumeEvaluationAction, without waiting for the page cache.
  const [evaluation, setEvaluation] = useState(initialEvaluation);
  const [streamingEvaluation, setStreamingEvaluation] =
    useState<Partial<OverallEvaluation> | null>(null);

  const generateEvaluation = async () => {
    setIsStreaming(true);
    setStreamingEvaluation({});

    try {
      const response = await fetch("/api/evaluations/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, positionId }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ?? "Errore durante la generazione della valutazione",
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Errore durante la generazione della valutazione");
      }

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamingEvaluation(parsePartialEvaluation(fullText));
      }

      // The route stored the evaluation on the server: read it back (the
      // action also expires the caches) instead of trusting the page cache
      const { evaluation: stored } = unwrap(
        await syncResumeEvaluationAction({ candidateId, positionId }),
      );
      setEvaluation(stored);
      toast.success("Valutazione generata con successo");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante la generazione della valutazione",
      );
    } finally {
      setIsStreaming(false);
      setStreamingEvaluation(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!hasResume && (
        <div className="flex flex-wrap items-center gap-2 bg-warning/10 px-3 py-2 rounded-lg text-warning text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          <span>Il candidato non ha un curriculum caricato</span>
          <Link
            href={`/dashboard/candidates/${candidateId}/edit`}
            className="font-medium underline underline-offset-2"
          >
            Carica il CV
          </Link>
        </div>
      )}

      {resumeUrl && (
        <a
          href={resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 w-fit text-primary text-sm hover:underline"
        >
          <FileText className="size-4" />
          Visualizza curriculum
          <ExternalLink className="size-3" />
        </a>
      )}

      {isStreaming && streamingEvaluation ? (
        <StreamingEvaluationCard
          streamingEvaluation={streamingEvaluation}
          streamingPositionTitle={positionTitle}
        />
      ) : evaluation ? (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center gap-4">
            <CardTitle>Valutazione del CV — {positionTitle}</CardTitle>
            {evaluation.fitScore !== null && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-md font-bold tabular-nums",
                  scoreTint(evaluation.fitScore),
                )}
              >
                {evaluation.fitScore}/10
              </span>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            {evaluation.evaluation && (
              <p className="whitespace-pre-wrap">{evaluation.evaluation}</p>
            )}
            {evaluation.strengths.length > 0 && (
              <div className="flex flex-col gap-1">
                <h4 className="font-medium text-success">Punti di forza</h4>
                <ul className="pl-5 list-disc">
                  {evaluation.strengths.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {evaluation.weaknesses.length > 0 && (
              <div className="flex flex-col gap-1">
                <h4 className="font-medium text-destructive">
                  Aree di miglioramento
                </h4>
                <ul className="pl-5 list-disc">
                  {evaluation.weaknesses.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {evaluation.recommendation && (
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Raccomandazione</h4>
                <p>{evaluation.recommendation}</p>
              </div>
            )}
            {evaluation.criteriaAssessment &&
              evaluation.criteriaAssessment.length > 0 && (
                <CriteriaAssessmentList
                  items={evaluation.criteriaAssessment}
                />
              )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">
              Il CV non è ancora stato valutato per questa posizione.
            </p>
            <Button
              type="button"
              variant={primaryAction ? "default" : "outline"}
              size="sm"
              disabled={!hasResume || isStreaming}
              onClick={generateEvaluation}
            >
              {isStreaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Valuta CV
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
