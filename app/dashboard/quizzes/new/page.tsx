import { ProgrammingLanguageSelect } from "@/components/quiz/programming-language-select";
import { getAllPositions } from "@/lib/data/positions";
import type { Position } from "@/lib/prisma/client";
import { Suspense } from "react";
import { NewQuizCreationPage, PositionOption } from "./new-quiz-page";

const positionsLoaderFallback = (
  <div className="p-6 border border-muted/50 border-dashed rounded-xl text-center">
    <p className="text-muted-foreground">Caricamento delle posizioni...</p>
  </div>
);

export default function NewQuizPage() {
  const positionsPromise = getAllPositions();

  return (
    <div className="space-y-6">
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="font-bold text-3xl">Crea un nuovo quiz</h1>
          <p className="text-muted-foreground text-sm">
            Seleziona una posizione e costruisci il quiz con le domande che
            preferisci o fai partire la generazione AI completa.
          </p>
        </div>
      </div>
      <Suspense fallback={positionsLoaderFallback}>
        <PositionsContent positionsPromise={positionsPromise} />
      </Suspense>
    </div>
  );
}

async function PositionsContent({
  positionsPromise,
}: {
  positionsPromise: Promise<Position[]>;
}) {
  const positions = await positionsPromise;

  const serializedPositions: PositionOption[] = positions.map((position) => ({
    id: position.id,
    title: position.title,
    experienceLevel: position.experienceLevel,
    skills: position.skills,
  }));

  return (
    <NewQuizCreationPage
      positions={serializedPositions}
      languageOptions={
        <Suspense fallback={<div>Loading...</div>}>
          <ProgrammingLanguageSelect />
        </Suspense>
      }
    />
  );
}
