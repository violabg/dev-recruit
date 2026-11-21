import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "cn";
import PageHeader from "@/components/page-header";
import { SelectOptionsSkeleton } from "@/components/skeletons";
import { ProgrammingLanguageSelectItems } from "@/components/quiz/programming-language-select-items";
import { getAllPositions } from "@/lib/data/positions";
import { getAllPresets } from "@/lib/data/presets";
import { getFavoriteQuestions } from "@/lib/data/questions";
import { getCriterionOptionsByPosition } from "@/lib/data/scorecards";
import type { Position } from "@/lib/prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
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
      <p>Seleziona una posizione per iniziare la creazione del quiz.</p>
    </div>
  </>
);

export default function NewQuizPage() {
  const positionsPromise = getAllPositions();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuovo quiz"
        description="Scegli una posizione e costruisci il quiz con le domande che preferisci, oppure avvia la generazione AI completa."
        actionBtns={
          <Link
            href={"/dashboard/quizzes" as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="size-4" />
            Quiz
          </Link>
        }
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
