import { PageHeaderSkeleton } from "@/components/skeletons";
import {
  ButtonSkeleton,
  FieldSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

/**
 * Mirrors InviteCandidatesContent: back link, title + description (quiz and
 * position names are the only dynamic text), tabs, and the default
 * "Assign to candidates" card with the CandidateSelectionForm.
 */
export function InviteCandidatesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton section="quizzes" description />

      <div className="flex flex-col gap-2">
        {/* Line TabsList (h-10, full width, bottom border) */}
        <div className="flex items-center border-b h-10">
          <Skeleton className="w-72 h-4" />
        </div>
        <div className="flex flex-col gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assegna il quiz ai candidati</CardTitle>
              <CardDescription>
                Seleziona i candidati e crea i link del test per questo quiz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6">
                <FieldSkeleton label="Seleziona i candidati" required />
                <ButtonSkeleton size="sm" className="w-40" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
