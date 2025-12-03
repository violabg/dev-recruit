"use client";

import { OverallEvaluationCard } from "@/components/recruting/overall-evaluation-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteEvaluation,
  updateEvaluationNotes,
} from "@/lib/actions/evaluation-entity";
import type { EvaluationWithRelations } from "@/lib/data/evaluations";
import type { OverallEvaluation } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { ChevronDown, Loader2, Plus, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

/** Unescape JSON string values */
function unescapeJsonString(str: string): string {
  return str.replace(/\\n/g, "\n").replace(/\\"/g, '"');
}

/** Extract array items from partial JSON using regex */
function extractArrayItems(content: string): string[] {
  return [...content.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) =>
    unescapeJsonString(m[1])
  );
}

/** Parse partial JSON fields as they stream in */
function parsePartialEvaluation(text: string): Partial<OverallEvaluation> {
  const partialEval: Partial<OverallEvaluation> = {};

  // Try to parse evaluation field
  const evalMatch = text.match(/"evaluation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (evalMatch) {
    partialEval.evaluation = unescapeJsonString(evalMatch[1]);
  }

  // Try to parse strengths array
  const strengthsMatch = text.match(/"strengths"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
  if (strengthsMatch) {
    const strengths = extractArrayItems(strengthsMatch[1]);
    if (strengths.length > 0) {
      partialEval.strengths = strengths;
    }
  }

  // Try to parse weaknesses array
  const weaknessesMatch = text.match(/"weaknesses"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
  if (weaknessesMatch) {
    const weaknesses = extractArrayItems(weaknessesMatch[1]);
    if (weaknesses.length > 0) {
      partialEval.weaknesses = weaknesses;
    }
  }

  // Try to parse recommendation field
  const recMatch = text.match(/"recommendation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (recMatch) {
    partialEval.recommendation = unescapeJsonString(recMatch[1]);
  }

  // Try to parse fitScore field
  const scoreMatch = text.match(/"fitScore"\s*:\s*(\d+)/);
  if (scoreMatch) {
    partialEval.fitScore = parseInt(scoreMatch[1], 10);
  }

  return partialEval;
}

interface Position {
  id: string;
  title: string;
}

interface CandidateEvaluationsViewProps {
  candidateId: string;
  candidateName: string;
  evaluations: EvaluationWithRelations[];
  positions: Position[];
  hasResume: boolean;
}

export function CandidateEvaluationsView({
  candidateId,
  candidateName,
  evaluations: initialEvaluations,
  positions,
  hasResume,
}: CandidateEvaluationsViewProps) {
  const [evaluations, setEvaluations] =
    useState<EvaluationWithRelations[]>(initialEvaluations);
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedEvaluation, setExpandedEvaluation] = useState<string | null>(
    evaluations.length > 0 ? evaluations[0].id : null
  );
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    evaluations.forEach((e) => {
      initial[e.id] = e.notes ?? "";
    });
    return initial;
  });
  const [savingNotes, startSavingNotes] = useTransition();
  const [streamingEvaluation, setStreamingEvaluation] =
    useState<Partial<OverallEvaluation> | null>(null);
  const [streamingPositionTitle, setStreamingPositionTitle] = useState<
    string | null
  >(null);
  const router = useRouter();
  const prevEvaluationsLengthRef = useRef(initialEvaluations.length);
  const isStreamingRef = useRef(false);

  // Update evaluations when prop changes (after router.refresh())
  useEffect(() => {
    const prevLength = prevEvaluationsLengthRef.current;
    const newLength = initialEvaluations.length;

    setEvaluations(initialEvaluations);

    // Clear streaming state when new data arrives from server (new evaluation added)
    if (isStreamingRef.current && newLength > prevLength) {
      setStreamingEvaluation(null);
      setStreamingPositionTitle(null);
      setIsGenerating(false);
      isStreamingRef.current = false;

      // Expand the newly added evaluation (first one since sorted by createdAt desc)
      const newEval = initialEvaluations[0];
      if (newEval) {
        setExpandedEvaluation(newEval.id);
        setNotes((prev) => ({ ...prev, [newEval.id]: newEval.notes ?? "" }));
      }
    }

    prevEvaluationsLengthRef.current = newLength;
  }, [initialEvaluations]);

  // Filter out positions that already have an evaluation
  const evaluatedPositionIds = new Set(
    evaluations.map((e) => e.positionId).filter(Boolean)
  );
  const availablePositions = positions.filter(
    (p) => !evaluatedPositionIds.has(p.id)
  );

  const handleGenerateEvaluation = useCallback(async () => {
    if (!selectedPositionId) {
      toast.error("Seleziona una posizione");
      return;
    }

    if (!hasResume) {
      toast.error(
        "Il candidato non ha un curriculum caricato. Carica un curriculum prima di generare la valutazione."
      );
      return;
    }

    const position = positions.find((p) => p.id === selectedPositionId);
    setStreamingPositionTitle(position?.title ?? "Valutazione");
    setStreamingEvaluation({});
    setIsGenerating(true);
    isStreamingRef.current = true;

    try {
      const response = await fetch("/api/evaluations/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, positionId: selectedPositionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Errore durante la generazione");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fullText += decoder.decode(value, { stream: true });
        setStreamingEvaluation(parsePartialEvaluation(fullText));
      }

      // Stream only closes after DB save completes, so we can safely refresh
      setSelectedPositionId("");
      toast.success("Valutazione generata con successo");
      router.refresh();
    } catch (error) {
      console.error("Error generating evaluation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante la generazione della valutazione"
      );
      // Clear streaming state on error
      setStreamingEvaluation(null);
      setStreamingPositionTitle(null);
      setIsGenerating(false);
      isStreamingRef.current = false;
    }
  }, [selectedPositionId, hasResume, positions, candidateId, router]);

  const handleSaveNotes = (evaluationId: string) => {
    startSavingNotes(async () => {
      try {
        await updateEvaluationNotes(evaluationId, notes[evaluationId] ?? "");
        toast.success("Note salvate con successo");
      } catch (error) {
        console.error("Error saving notes:", error);
        toast.error("Errore durante il salvataggio delle note");
      }
    });
  };

  const handleDeleteEvaluation = async (evaluationId: string) => {
    await deleteEvaluation(evaluationId);
    setEvaluations((prev) => prev.filter((e) => e.id !== evaluationId));
  };

  return (
    <div className="space-y-6">
      {/* Generate new evaluation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nuova valutazione curriculum
          </CardTitle>
          <CardDescription>
            Genera una valutazione AI del curriculum di {candidateName} per una
            posizione specifica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasResume ? (
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                Il candidato non ha un curriculum caricato. Carica un curriculum
                dalla pagina del candidato prima di poter generare una
                valutazione.
              </p>
            </div>
          ) : availablePositions.length === 0 ? (
            <div className="bg-muted/50 p-4 rounded-md">
              <p className="text-muted-foreground text-sm">
                Sono già state generate valutazioni per tutte le posizioni
                disponibili.
              </p>
            </div>
          ) : (
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="position">Posizione</Label>
                <Select
                  value={selectedPositionId}
                  onValueChange={setSelectedPositionId}
                >
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Seleziona una posizione" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePositions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerateEvaluation}
                disabled={isGenerating || !selectedPositionId}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4" />
                )}
                {isGenerating ? "Generazione..." : "Genera valutazione"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List of evaluations */}
      {evaluations.length === 0 && !streamingEvaluation ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Nessuna valutazione disponibile per questo candidato.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">
            Valutazioni esistenti ({evaluations.length}
            {streamingEvaluation ? " + 1 in corso" : ""})
          </h2>

          {/* Streaming evaluation card - shown as first item in list */}
          {streamingEvaluation && (
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
                    <p className="text-sm">
                      {streamingEvaluation.recommendation}
                    </p>
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
          )}

          {evaluations.map((evaluation) => {
            const isExpanded = expandedEvaluation === evaluation.id;
            const overallEvaluation = {
              evaluation: evaluation.evaluation ?? undefined,
              strengths: evaluation.strengths,
              weaknesses: evaluation.weaknesses,
              recommendation: evaluation.recommendation ?? undefined,
              fitScore: evaluation.fitScore ?? undefined,
            };

            return (
              <Collapsible
                key={evaluation.id}
                open={isExpanded}
                onOpenChange={(open) =>
                  setExpandedEvaluation(open ? evaluation.id : null)
                }
              >
                <Card className="py-0">
                  <CardHeader className="gap-0 p-0">
                    <div className="flex items-center">
                      <CollapsibleTrigger asChild>
                        <button className="flex flex-1 items-center gap-3 hover:bg-muted/50 p-6 rounded-t-lg text-left transition-colors">
                          <ChevronDown
                            className={cn(
                              "w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0",
                              isExpanded && "rotate-180"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-primary text-lg">
                              {evaluation.title}
                            </CardTitle>
                            <CardDescription>
                              Creata il{" "}
                              {new Date(
                                evaluation.createdAt
                              ).toLocaleDateString("it-IT", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                              {evaluation.fitScore !== null && (
                                <span className="ml-2">
                                  • Punteggio: {evaluation.fitScore}/10
                                </span>
                              )}
                            </CardDescription>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <div className="pr-4">
                        <DeleteWithConfirm
                          deleteAction={() =>
                            handleDeleteEvaluation(evaluation.id)
                          }
                          title="Eliminare la valutazione?"
                          description={`Sei sicuro di voler eliminare la valutazione "${evaluation.title}"? Questa azione non può essere annullata.`}
                          successMessage="Valutazione eliminata"
                          errorMessage="Errore durante l'eliminazione della valutazione"
                          variant="ghost"
                          iconOnly
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="space-y-6 pt-0 pb-6">
                      <OverallEvaluationCard
                        overallEvaluation={overallEvaluation}
                      />

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`notes-${evaluation.id}`}>
                            Note manuali
                          </Label>
                          <Textarea
                            id={`notes-${evaluation.id}`}
                            value={notes[evaluation.id] ?? ""}
                            onChange={(e) =>
                              setNotes((prev) => ({
                                ...prev,
                                [evaluation.id]: e.target.value,
                              }))
                            }
                            placeholder="Inserisci le tue note qui..."
                            rows={3}
                          />
                        </div>
                        <Button
                          onClick={() => handleSaveNotes(evaluation.id)}
                          disabled={
                            savingNotes ||
                            notes[evaluation.id] === (evaluation.notes ?? "")
                          }
                          size="sm"
                        >
                          {savingNotes ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 size-4" />
                          )}
                          Salva note
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
