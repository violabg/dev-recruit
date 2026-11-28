import { SelectOptionsSkeleton } from "@/components/skeletons";
import {
  NewQuizCreationPage,
  PositionOption,
} from "@/app/dashboard/quizzes/new/new-quiz-page";
import PageHeader from "@/components/page-header";
import { ProgrammingLanguageSelectItems } from "@/components/quiz/programming-language-select-items";
import { getPositionById } from "@/lib/data/positions";
import { getAllPresets } from "@/lib/data/presets";
import { getFavoriteQuestions } from "@/lib/data/questions";
import { getCriterionOptionsByPosition } from "@/lib/data/scorecards";
import { positionTrail } from "@/lib/utils/breadcrumbs";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { QuizGeneratorSkeleton } from "./fallbacks";

export default async function GenerateQuizPage({
  params: incomingParams,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<QuizGeneratorSkeleton />}>
        <QuizGeneratorContent params={incomingParams} />
      </Suspense>
    </div>
  );
}

async function QuizGeneratorContent({
  params: incomingParams,
}: {
  params: Promise<{ id: string }>;
}) {
  const presetsPromise = getAllPresets().catch(() => []);
  const favoriteQuestionsPromise = getFavoriteQuestions().catch(() => []);
  const { id } = await incomingParams;
  const [position, criteriaByPosition] = await Promise.all([
    getPositionById(id),
    getCriterionOptionsByPosition(),
  ]);

  if (!position) {
    redirect("/dashboard/positions");
  }

  const positionOption: PositionOption = {
    id: position.id,
    title: position.title,
    experienceLevel: position.experienceLevel,
    skills: position.skills,
  };

  return (
    <>
      <PageHeader
        title="Nuovo test"
        breadcrumbs={positionTrail(position, { label: "Nuovo test" })}
      />
      <NewQuizCreationPage
        fixedPosition={positionOption}
        criteriaByPosition={criteriaByPosition}
        presetsPromise={presetsPromise}
        favoriteQuestionsPromise={favoriteQuestionsPromise}
        languageOptions={
          <Suspense fallback={<SelectOptionsSkeleton />}>
            <ProgrammingLanguageSelectItems />
          </Suspense>
        }
      />
    </>
  );
}
