import { EditQuizFormSkeleton } from "@/components/quiz/edit-quiz-form-skeleton";

/** The edit page renders EditQuizForm directly (no page header). */
export function EditQuizSkeleton() {
  return <EditQuizFormSkeleton questions={3} />;
}
