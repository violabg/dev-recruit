import { SelectOptionsSkeleton } from "@/components/skeletons";
import { ProgrammingLanguageSelectItems } from "@/components/quiz/programming-language-select-items";
import { getAllPositions } from "@/lib/data/positions";
import { getAllPresets } from "@/lib/data/presets";
import type { Position } from "@/lib/prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { NewQuizCreationPage, PositionOption } from "./new-quiz-page";

/**
 * Mirrors NewQuizCreationPage before a position is chosen: the full-width
 * position Select (h-9) followed by the "Seleziona una posizione" prompt.
 * It's a fragment because the page wrapper already applies space-y-6.
 */
const positionsLoaderFallback = (
  <>
    <Skeleton className="rounded-lg w-full h-9" />
    <div className="p-6 border border-muted/50 rounded-xl text-center">
      <p>Seleziona una posizione per iniziare la creazione del quiz.</p>
    </div>
  </>
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
  const presetsPromise = getAllPresets().catch(() => []);
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
      presetsPromise={presetsPromise}
      languageOptions={
        <Suspense fallback={<SelectOptionsSkeleton />}>
          <ProgrammingLanguageSelectItems />
        </Suspense>
      }
    />
  );
}
