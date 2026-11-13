import { SelectOptionsSkeleton } from "@/components/skeletons";
import {
  NewQuizCreationPage,
  PositionOption,
} from "@/app/dashboard/quizzes/new/new-quiz-page";
import { ProgrammingLanguageSelectItems } from "@/components/quiz/programming-language-select-items";
import { getPositionById } from "@/lib/data/positions";
import { getAllPresets } from "@/lib/data/presets";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { QuizGeneratorSkeleton } from "./fallbacks";

export default async function GenerateQuizPage({
  params: incomingParams,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="space-y-6">
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
  const { id } = await incomingParams;
  const position = await getPositionById(id);

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
    <NewQuizCreationPage
      fixedPosition={positionOption}
      presetsPromise={presetsPromise}
      languageOptions={
        <Suspense fallback={<SelectOptionsSkeleton />}>
          <ProgrammingLanguageSelectItems />
        </Suspense>
      }
    />
  );
}
