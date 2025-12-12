import { EditQuizForm } from "@/components/quiz/edit-quiz-form";
import { getQuizData } from "@/lib/data/quizzes";
import { getReferenceDataByCategory } from "@/lib/data/reference-data";
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
  const [data, languagesData] = await Promise.all([
    getQuizData(awaitedParams.id),
    getReferenceDataByCategory("programmingLanguage"),
  ]);

  if (!data) return notFound();

  const { quiz, position } = data;
  const languages = languagesData.map((item) => ({
    value: item.label.toLowerCase(),
    label: item.label,
  }));

  return (
    <EditQuizForm quiz={quiz} position={position} languageOptions={languages} />
  );
}
