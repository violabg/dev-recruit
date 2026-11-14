import { CandidateFormBodySkeleton } from "@/components/candidates/candidate-form-skeleton";
import { TextSkeleton } from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Mirrors ApplyFormClient: 2-col grid with the CandidateForm (apply mode) on
 * the left and the selected-positions panel (empty dashed card) on the right.
 */
export function ApplyFormSkeleton() {
  return (
    <div className="gap-6 grid grid-cols-1 lg:grid-cols-2 h-full">
      <div>
        <CandidateFormBodySkeleton mode="apply" />
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto">
        <Card className="flex justify-center items-center border-dashed h-full min-h-96">
          <CardContent className="flex justify-center">
            <TextSkeleton className="w-64" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
