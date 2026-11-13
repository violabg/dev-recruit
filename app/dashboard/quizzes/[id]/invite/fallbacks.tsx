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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2.5 h-7 font-medium text-[0.8rem] text-muted-foreground">
          <ArrowLeft className="mr-1 size-4" />
          Back to quiz
        </span>
      </div>

      <div>
        <h1 className="font-bold text-3xl">Assign quiz to candidates</h1>
        <TextSkeleton lineClassName="h-6" className="w-96 max-w-full h-4" />
      </div>

      <div className="flex flex-col gap-2">
        {/* TabsList (h-8): "Assign to candidates" / "Created interviews" */}
        <Skeleton className="rounded-lg w-80 h-8" />
        <div className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assign quiz to candidates</CardTitle>
              <CardDescription>
                Select candidates and create interview links for this quiz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <FieldSkeleton label="Select candidates" required />
                <ButtonSkeleton size="sm" className="w-40" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
