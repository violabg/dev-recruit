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
import { Textarea } from "@/components/ui/textarea";
import type { EvaluationWithRelations } from "@/lib/data/evaluations";
import type { OverallEvaluation } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { ChevronDown, Loader2, Save } from "lucide-react";

interface EvaluationItemProps {
  evaluation: EvaluationWithRelations;
  isExpanded: boolean;
  onToggle: (open: boolean) => void;
  notes: string;
  setNotes: (note: string) => void;
  savingNotes: boolean;
  handleSaveNotes: (id: string) => void;
  handleDeleteEvaluation: (id: string) => Promise<void>;
}

export function EvaluationItem({
  evaluation,
  isExpanded,
  onToggle,
  notes,
  setNotes,
  savingNotes,
  handleSaveNotes,
  handleDeleteEvaluation,
}: EvaluationItemProps) {
  const overallEvaluation: Partial<OverallEvaluation> = {
    evaluation: evaluation.evaluation ?? undefined,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    recommendation: evaluation.recommendation ?? undefined,
    fitScore: evaluation.fitScore ?? undefined,
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={(open) => onToggle(open)}>
      <Card className="py-0">
        <CardHeader className="gap-0 p-0">
          <div className="flex items-center">
            <CollapsibleTrigger
              render={
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
                      {new Date(evaluation.createdAt).toLocaleDateString(
                        "it-IT",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                      {evaluation.fitScore !== null && (
                        <span className="ml-2">
                          • Punteggio: {evaluation.fitScore}/10
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </button>
              }
            />
            <div className="pr-4">
              <DeleteWithConfirm
                deleteAction={() => handleDeleteEvaluation(evaluation.id)}
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
            <OverallEvaluationCard overallEvaluation={overallEvaluation} />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`notes-${evaluation.id}`}>Note manuali</Label>
                <Textarea
                  id={`notes-${evaluation.id}`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Inserisci le tue note qui..."
                  rows={3}
                />
              </div>
              <Button
                onClick={() => handleSaveNotes(evaluation.id)}
                disabled={savingNotes || notes === (evaluation.notes ?? "")}
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
}

export default EvaluationItem;
