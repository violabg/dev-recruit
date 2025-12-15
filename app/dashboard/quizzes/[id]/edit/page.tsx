import { EditQuizForm } from "@/components/quiz/edit-quiz-form";
import { ProgrammingLanguageSelectItems } from "@/components/quiz/programming-language-select-items";
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
  const awaitedParams = await params;
  const data = await getQuizData(awaitedParams.id);

  if (!data) return notFound();

  const { quiz, position } = data;

  return (
    <EditQuizForm
      quiz={quiz}
      position={position}
      languageOptions={
        <Suspense fallback={<div>Loading...</div>}>
          <ProgrammingLanguageSelectItems />
        </Suspense>
      }
    />
  );
}
