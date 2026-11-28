import { EditQuizFormSkeleton } from "@/components/quiz/edit-quiz-form-skeleton";
import { PageHeaderSkeleton } from "@/components/skeletons";

/** The edit page: page header, then EditQuizForm. */
export function EditQuizSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <EditQuizFormSkeleton questions={3} />
    </div>
  );
}
