"use client";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Position } from "./types";

interface GenerateEvaluationCardProps {
  candidateName: string;
  availablePositions: Position[];
  selectedPositionId: string;
  setSelectedPositionId: (id: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  hasResume: boolean;
}

export function GenerateEvaluationCard({
  candidateName,
  availablePositions,
  selectedPositionId,
  setSelectedPositionId,
  isGenerating,
  onGenerate,
  hasResume,
}: GenerateEvaluationCardProps) {
  const positionOptions = [
    { value: null, label: "Seleziona una posizione" },
    ...availablePositions.map((position) => ({
      value: position.id,
      label: position.title,
    })),
  ];

  return (
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
                items={positionOptions}
                value={selectedPositionId}
                onValueChange={(value) => setSelectedPositionId(value || "")}
              >
                <SelectTrigger id="position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {positionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={onGenerate}
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
  );
}

export default GenerateEvaluationCard;
