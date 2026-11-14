import { SelectOptionsSkeleton } from "@/components/skeletons";
import { EditQuizForm } from "@/components/quiz/edit-quiz-form";
import { ProgrammingLanguageSelectItems } from "@/components/quiz/programming-language-select-items";
import { getAllPresets } from "@/lib/data/presets";
import { getFavoriteQuestions } from "@/lib/data/questions";
import { getQuizData } from "@/lib/data/quizzes";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditQuizSkeleton } from "./fallbacks";

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditQuizSkeleton />}>
      <EditQuizContent params={params} />
    </Suspense>
  );
}

async function EditQuizContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Start the (cached) presets query without awaiting it: it runs in parallel
  // with the quiz fetch and streams into the client editor via use().
  const presetsPromise = getAllPresets().catch(() => []);
  const favoriteQuestionsPromise = getFavoriteQuestions().catch(() => []);
  const awaitedParams = await params;
  const data = await getQuizData(awaitedParams.id);

  if (!data) return notFound();

  const { quiz, position } = data;

  return (
    <EditQuizForm
      quiz={quiz}
      position={position}
      presetsPromise={presetsPromise}
      favoriteQuestionsPromise={favoriteQuestionsPromise}
      languageOptions={
        <Suspense key="languages" fallback={<SelectOptionsSkeleton />}>
          <ProgrammingLanguageSelectItems />
        </Suspense>
      }
    />
  );
}
