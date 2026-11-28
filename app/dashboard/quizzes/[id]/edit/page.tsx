import { SelectOptionsSkeleton } from "@/components/skeletons";
import PageHeader from "@/components/page-header";
import { SECTIONS } from "@/components/dashboard/sections";
import { EditQuizForm } from "@/components/quiz/edit-quiz-form";
import { ProgrammingLanguageSelectItems } from "@/components/quiz/programming-language-select-items";
import { getAllPresets } from "@/lib/data/presets";
import { getFavoriteQuestions } from "@/lib/data/questions";
import { getQuizData } from "@/lib/data/quizzes";
import { getScorecardByPositionId } from "@/lib/data/scorecards";
import { sectionTrail } from "@/lib/utils/breadcrumbs";
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

  // Criteria of the quiz position: the active ones are selectable, the
  // archived ones stay visible where already linked
  const scorecard = await getScorecardByPositionId(position.id);
  const criteria = [
    ...(scorecard?.criteria ?? []).map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      category: criterion.category,
      priority: criterion.priority,
    })),
    ...(scorecard?.archivedCriteria ?? []).map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      category: criterion.category,
      priority: criterion.priority,
      archived: true,
    })),
  ];

  // Ids of deleted criteria are dropped here, so the next save removes them
  const knownCriterionIds = new Set(criteria.map((criterion) => criterion.id));
  const quizForEditor = {
    ...quiz,
    questions: quiz.questions.map((question) =>
      question.criterionIds
        ? {
            ...question,
            criterionIds: question.criterionIds.filter((id) =>
              knownCriterionIds.has(id),
            ),
          }
        : question,
    ),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Modifica test"
        breadcrumbs={sectionTrail(
          SECTIONS.quizzes,
          { label: quiz.title, href: `/dashboard/quizzes/${quiz.id}` },
          { label: "Modifica" },
        )}
      />
      <EditQuizForm
        quiz={quizForEditor}
        position={position}
        criteria={criteria}
        presetsPromise={presetsPromise}
        favoriteQuestionsPromise={favoriteQuestionsPromise}
        languageOptions={
          <Suspense key="languages" fallback={<SelectOptionsSkeleton />}>
            <ProgrammingLanguageSelectItems />
          </Suspense>
        }
      />
    </div>
  );
}
