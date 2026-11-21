import {
  ButtonSkeleton,
  PageHeaderSkeleton,
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

/** Mirrors CandidateEvaluationsContent: back link, title, description, list. */
export function CandidateEvaluationsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton description />
      <Card>
        <CardHeader>
          <TextSkeleton lineClassName="h-7" className="w-56 h-5" />
          <TextSkeleton className="w-72 max-w-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="rounded-lg w-full h-9" />
          <ButtonSkeleton className="w-40" />
        </CardContent>
      </Card>
    </div>
  );
}

/** Mirrors CandidateQuizContent: back link, static title, line tabs, card. */
export function CandidateQuizSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton description />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-5 border-b h-10">
          <span className="font-semibold text-[0.9375rem] text-heading">
            Assegna quiz
          </span>
          <span className="text-[0.9375rem] text-muted-foreground">
            Test esistenti
          </span>
        </div>
        <div className="flex flex-col gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assegna quiz al candidato</CardTitle>
              <CardDescription>
                Seleziona i quiz e crea i link del test per questo candidato
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="rounded-lg w-full h-12" />
              ))}
              <ButtonSkeleton size="sm" className="w-40" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
