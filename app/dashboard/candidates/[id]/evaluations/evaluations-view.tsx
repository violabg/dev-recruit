"use client";

import { OverallEvaluationCard } from "@/components/recruting/overall-evaluation-card";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createCandidateEvaluation,
  deleteEvaluation,
  updateEvaluationNotes,
} from "@/lib/actions/evaluation-entity";
import type { EvaluationWithRelations } from "@/lib/data/evaluations";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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

  // Filter out positions that already have an evaluation
  const evaluatedPositionIds = new Set(
    evaluations.map((e) => e.positionId).filter(Boolean)
  );
  const availablePositions = positions.filter(
    (p) => !evaluatedPositionIds.has(p.id)
  );

  const handleGenerateEvaluation = async () => {
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

    setIsGenerating(true);

    try {
      const newEvaluation = await createCandidateEvaluation(
        candidateId,
        selectedPositionId
      );

      // Add the new evaluation to the list
      const position = positions.find((p) => p.id === selectedPositionId);
      const enrichedEvaluation = {
        ...newEvaluation,
        interview: null,
        candidate: null,
        position: position
          ? {
              id: position.id,
              title: position.title,
            }
          : null,
        creator: null,
      } as unknown as EvaluationWithRelations;

      setEvaluations((prev) => [enrichedEvaluation, ...prev]);
      setNotes((prev) => ({
        ...prev,
        [newEvaluation.id]: newEvaluation.notes ?? "",
      }));
      setExpandedEvaluation(newEvaluation.id);
      setSelectedPositionId("");

      toast.success("Valutazione generata con successo");
    } catch (error) {
      console.error("Error generating evaluation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante la generazione della valutazione"
      );
    } finally {
      setIsGenerating(false);
    }
  };

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
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 w-4 h-4" />
                )}
                {isGenerating ? "Generazione..." : "Genera valutazione"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List of evaluations */}
      {evaluations.length === 0 ? (
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
            Valutazioni esistenti ({evaluations.length})
          </h2>

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
                        >
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                        </DeleteWithConfirm>
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
                            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 w-4 h-4" />
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
