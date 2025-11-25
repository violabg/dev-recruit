"use client";

import { EditQuizForm } from "@/components/quiz/edit-quiz-form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SaveQuizResult } from "@/hooks/use-edit-quiz-form";
import { QuizForEdit } from "@/lib/data/quizzes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type PositionOption = {
  id: string;
  title: string;
  experienceLevel: string;
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

  const blankQuiz = useMemo<QuizForEdit | null>(() => {
    if (!selectedPosition) {
      return null;
    }

    return {
      id: `new-${selectedPosition.id}`,
      title: "",
      positionId: selectedPosition.id,
      questions: [],
      timeLimit: null,
    };
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
    <>
      {!fixedPosition && (
        <Select
          value={selectedPositionId}
          onValueChange={setSelectedPositionId}
          disabled={availablePositions.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleziona posizione" />
          </SelectTrigger>
          <SelectContent>
            {availablePositions.map((position) => (
              <SelectItem key={position.id} value={position.id}>
                {position.title} ({position.experienceLevel})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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
    </>
  );
};
