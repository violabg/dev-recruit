"use client";

import { EditQuizForm } from "@/components/quiz/edit-quiz-form";
import { buttonVariants } from "@/components/ui/button";

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
import { useMemo, useState } from "react";

export type PositionOption = {
  id: string;
  title: string;
  experienceLevel: string;
  skills: string[];
};

type NewQuizPageProps = {
  positions?: PositionOption[];
  fixedPosition?: PositionOption;
  languageOptions?: React.ReactNode;
};

export const NewQuizCreationPage = ({
  positions = [],
  fixedPosition,
  languageOptions,
}: NewQuizPageProps) => {
  const [selectedPositionId, setSelectedPositionId] = useState(
    fixedPosition?.id ?? ""
  );
  const router = useRouter();

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

  const availablePositions = [
    {
      value: null,
      label: "Seleziona una posizione",
    },
    ...(fixedPosition ? [fixedPosition] : positions).map((position) => ({
      value: position.id,
      label: `${position.title} (${position.experienceLevel})`,
    })),
  ];

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
          value={selectedPositionId || null}
          items={availablePositions}
          onValueChange={(value: string | null) =>
            setSelectedPositionId(value ?? "")
          }
          disabled={availablePositions.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availablePositions.map((position) => (
              <SelectItem
                key={String(position.value ?? "none")}
                value={position.value}
              >
                {position.label}
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
          <Link
            href="/dashboard/positions"
            className={`mt-4 ${buttonVariants({
              variant: "outline",
              size: "sm",
            })}`}
          >
            Vai alle posizioni
          </Link>
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
          languageOptions={languageOptions}
        />
      )}
    </>
  );
};
