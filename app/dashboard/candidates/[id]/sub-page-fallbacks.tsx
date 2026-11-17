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

const TITLE_CLASS =
  "font-display font-extrabold text-heading text-[2.125rem] lg:text-[2.5rem] text-balance leading-[2.5rem] lg:leading-[2.875rem] tracking-[-0.03em]";

/** Back-link row placeholder (ghost sm button). */
function BackRow() {
  return (
    <div className="flex items-center gap-2">
      <ButtonSkeleton size="sm" className="w-36" />
    </div>
  );
}

/** Mirrors CandidateEvaluationsContent: back link, title, description, list. */
export function CandidateEvaluationsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <BackRow />
      <div>
        <TextSkeleton
          lineClassName="h-10 lg:h-[2.875rem]"
          className="w-80 max-w-full h-7"
        />
        <p className="mt-1 text-muted-foreground">
          Valutazioni del curriculum per diverse posizioni
        </p>
      </div>
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
      <BackRow />
      <div>
        <h1 className={TITLE_CLASS}>Assegna quiz al candidato</h1>
        <TextSkeleton lineClassName="h-6" className="w-96 max-w-full h-4" />
      </div>
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
