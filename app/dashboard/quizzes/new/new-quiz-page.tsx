"use client";

import { EditQuizForm } from "@/app/dashboard/quizzes/[id]/edit/components/edit-quiz-form";
import { SaveQuizResult } from "@/app/dashboard/quizzes/[id]/edit/hooks/use-edit-quiz-form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuizForm } from "@/lib/schemas";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type PositionOption = {
  id: string;
  title: string;
  experience_level: string;
  skills: string[];
};

type NewQuizPageProps = {
  positions?: PositionOption[];
  fixedPosition?: PositionOption;
};

export const NewQuizCreationPage = ({
  positions = [],
  fixedPosition,
}: NewQuizPageProps) => {
  const [selectedPositionId, setSelectedPositionId] = useState(
    fixedPosition?.id ?? ""
  );
  const router = useRouter();

  useEffect(() => {
    if (fixedPosition) {
      setSelectedPositionId(fixedPosition.id);
    }
  }, [fixedPosition]);

  const selectedPosition = useMemo(() => {
    if (fixedPosition) {
      return fixedPosition;
    }
    return (
      positions.find((position) => position.id === selectedPositionId) || null
    );
  }, [fixedPosition, positions, selectedPositionId]);

  const blankQuiz = useMemo<QuizForm | null>(() => {
    if (!selectedPosition) {
      return null;
    }

    return {
      id: `new-${selectedPosition.id}`,
      title: "",
      position_id: selectedPosition.id,
      questions: [],
      time_limit: null,
      difficulty: 3,
      instructions: "",
      created_at: new Date().toISOString(),
      created_by: "",
      updated_at: undefined,
      updated_by: undefined,
    } as QuizForm;
  }, [selectedPosition]);

  const availablePositions = fixedPosition ? [fixedPosition] : positions;
  const shouldShowSelectPrompt =
    !fixedPosition && availablePositions.length > 0 && !selectedPositionId;
  const noPositionsAvailable =
    !fixedPosition && availablePositions.length === 0;

  const handleSaveSuccess = (result?: SaveQuizResult) => {
    if (result?.id) {
      router.push(`/dashboard/quizzes/${result.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="font-bold text-3xl">Crea un nuovo quiz</h1>
          <p className="text-muted-foreground text-sm">
            Seleziona una posizione e costruisci il quiz o lascia che l'AI
            completi la generazione per te.
          </p>
        </div>
        {!fixedPosition && (
          <div className="flex flex-col sm:items-end gap-2">
            <Select
              value={selectedPositionId}
              onValueChange={setSelectedPositionId}
              disabled={availablePositions.length === 0}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Seleziona posizione" />
              </SelectTrigger>
              <SelectContent>
                {availablePositions.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.title} ({position.experience_level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {shouldShowSelectPrompt && (
              <p className="text-destructive text-xs">
                Seleziona una posizione prima di creare il quiz.
              </p>
            )}
          </div>
        )}
      </div>

      {noPositionsAvailable ? (
        <div className="p-6 border border-muted/50 border-dashed rounded-xl text-center">
          <p className="text-muted-foreground">
            Non ci sono ancora posizioni disponibili. Crea una posizione prima
            di costruire il quiz.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/dashboard/positions">Vai alle posizioni</Link>
          </Button>
        </div>
      ) : !selectedPosition || !blankQuiz ? (
        <div className="p-6 border border-muted/50 rounded-xl text-center">
          <p>Seleziona una posizione per iniziare la creazione del quiz.</p>
        </div>
      ) : (
        <EditQuizForm
          key={selectedPosition.id}
          quiz={blankQuiz}
          position={selectedPosition}
          mode="create"
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
};
