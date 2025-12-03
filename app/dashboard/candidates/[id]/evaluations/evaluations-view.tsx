"use client";
import { Card, CardContent } from "@/components/ui/card";
import {
  deleteEvaluation,
  updateEvaluationNotes,
} from "@/lib/actions/evaluation-entity";
import type { EvaluationWithRelations } from "@/lib/data/evaluations";
import type { OverallEvaluation } from "@/lib/schemas";
import EvaluationItem from "./evaluation-item";
import GenerateEvaluationCard from "./generate-evaluation-card";
import StreamingEvaluationCard from "./streaming-evaluation-card";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { parsePartialEvaluation } from "./streaming-utils";
import type { Position } from "./types";

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
      <GenerateEvaluationCard
        candidateName={candidateName}
        availablePositions={availablePositions}
        selectedPositionId={selectedPositionId}
        setSelectedPositionId={setSelectedPositionId}
        isGenerating={isGenerating}
        onGenerate={handleGenerateEvaluation}
        hasResume={hasResume}
      />

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
            <StreamingEvaluationCard
              streamingEvaluation={streamingEvaluation}
              streamingPositionTitle={streamingPositionTitle}
            />
          )}

          {evaluations.map((evaluation) => (
            <EvaluationItem
              key={evaluation.id}
              evaluation={evaluation}
              isExpanded={expandedEvaluation === evaluation.id}
              onToggle={(open) =>
                setExpandedEvaluation(open ? evaluation.id : null)
              }
              notes={notes[evaluation.id] ?? ""}
              setNotes={(note) =>
                setNotes((prev) => ({ ...prev, [evaluation.id]: note }))
              }
              savingNotes={savingNotes}
              handleSaveNotes={handleSaveNotes}
              handleDeleteEvaluation={handleDeleteEvaluation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
