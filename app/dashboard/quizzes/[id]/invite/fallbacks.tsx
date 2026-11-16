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
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2.5 h-7 font-medium text-[0.8rem] text-muted-foreground">
          <ArrowLeft className="mr-1 size-4" />
          Torna al quiz
        </span>
      </div>

      <div>
        <h1 className="font-display font-extrabold text-heading text-[2.125rem] lg:text-[2.5rem] text-balance leading-[2.5rem] lg:leading-[2.875rem] tracking-[-0.03em]">Assegna il quiz ai candidati</h1>
        <TextSkeleton lineClassName="h-6" className="w-96 max-w-full h-4" />
      </div>

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
