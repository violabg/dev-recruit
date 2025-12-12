import {
  NewQuizCreationPage,
  PositionOption,
} from "@/app/dashboard/quizzes/new/new-quiz-page";
import { getPositionById } from "@/lib/data/positions";
import { getReferenceDataByCategory } from "@/lib/data/reference-data";
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
  const { id } = await incomingParams;
  const [position, languagesData] = await Promise.all([
    getPositionById(id),
    getReferenceDataByCategory("programmingLanguage"),
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

  const languages = languagesData.map((item) => ({
    value: item.label.toLowerCase(),
    label: item.label,
  }));

  return (
    <NewQuizCreationPage
      fixedPosition={positionOption}
      languageOptions={languages}
    />
  );
}
