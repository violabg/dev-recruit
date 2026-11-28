import PageHeader from "@/components/page-header";
import { SECTIONS } from "@/components/dashboard/sections";
import { SelectOptionsSkeleton } from "@/components/skeletons";
import { ProgrammingLanguageSelectItems } from "@/components/quiz/programming-language-select-items";
import { getAllPositions } from "@/lib/data/positions";
import { getAllPresets } from "@/lib/data/presets";
import { getFavoriteQuestions } from "@/lib/data/questions";
import { getCriterionOptionsByPosition } from "@/lib/data/scorecards";
import type { Position } from "@/lib/prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
import { sectionTrail } from "@/lib/utils/breadcrumbs";
import { Suspense } from "react";
import { NewQuizCreationPage, PositionOption } from "./new-quiz-page";

/**
 * Mirrors NewQuizCreationPage before a position is chosen: the full-width
 * position Select (h-9) followed by the "Seleziona una posizione" prompt.
 * It's a fragment because the page wrapper already applies flex + gap.
 */
const positionsLoaderFallback = (
  <>
    <Skeleton className="rounded-lg w-full h-9" />
    <div className="p-6 border border-muted/50 rounded-xl text-center">
      <p>Seleziona una posizione per iniziare la creazione del test.</p>
    </div>
  </>
);

export default function NewQuizPage() {
  const positionsPromise = getAllPositions();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuovo test"
        description="Scegli una posizione e costruisci il test con le domande che preferisci, oppure avvia la generazione AI completa."
        breadcrumbs={sectionTrail(SECTIONS.quizzes, { label: "Nuovo test" })}
      />
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
  const favoriteQuestionsPromise = getFavoriteQuestions().catch(() => []);
  const [positions, criteriaByPosition] = await Promise.all([
    positionsPromise,
    getCriterionOptionsByPosition(),
  ]);

  const serializedPositions: PositionOption[] = positions.map((position) => ({
    id: position.id,
    title: position.title,
    experienceLevel: position.experienceLevel,
    skills: position.skills,
  }));

  return (
    <NewQuizCreationPage
      positions={serializedPositions}
      criteriaByPosition={criteriaByPosition}
      presetsPromise={presetsPromise}
      favoriteQuestionsPromise={favoriteQuestionsPromise}
      languageOptions={
        <Suspense fallback={<SelectOptionsSkeleton />}>
          <ProgrammingLanguageSelectItems />
        </Suspense>
      }
    />
  );
}
