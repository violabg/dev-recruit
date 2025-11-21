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
import { useMemo, useState } from "react";

export type PositionOption = {
  id: string;
  title: string;
  experience_level: string;
  skills: string[];
};

type NewQuizPageProps = {
  positions: PositionOption[];
};

export const NewQuizCreationPage = ({ positions }: NewQuizPageProps) => {
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const router = useRouter();

  const selectedPosition = useMemo(
    () =>
      positions.find((position) => position.id === selectedPositionId) || null,
    [positions, selectedPositionId]
  );

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

  const shouldShowSelectPrompt = positions.length > 0 && !selectedPositionId;

  const handleSaveSuccess = (result?: SaveQuizResult) => {
    if (result?.id) {
      router.push(`/dashboard/quizzes/${result.id}`);
    }
  };

  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <Select
          value={selectedPositionId}
          onValueChange={setSelectedPositionId}
          disabled={!positions.length}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleziona posizione" />
          </SelectTrigger>
          <SelectContent>
            {positions.map((position) => (
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
      {positions.length === 0 ? (
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
