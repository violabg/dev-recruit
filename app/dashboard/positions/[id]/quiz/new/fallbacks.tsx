import { EditQuizFormSkeleton } from "@/components/quiz/edit-quiz-form-skeleton";

/**
 * NewQuizCreationPage with a fixed position renders EditQuizForm in create
 * mode straight away (no position select, empty question list).
 */
export function QuizGeneratorSkeleton() {
  return <EditQuizFormSkeleton questions={0} />;
}
