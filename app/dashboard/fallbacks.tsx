import { TextSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_CARD_TITLES = [
  "Test da valutare",
  "Candidature ferme",
  "Posizioni con setup incompleto",
  "Colloqui senza kit pronto",
  "Schede da compilare",
];

/** Mirrors ActionCenter: five cards with title, count and rows. */
export function ActionCenterSkeleton() {
  return (
    <div className="gap-6 grid md:grid-cols-2 xl:grid-cols-3">
      {ACTION_CARD_TITLES.map((title) => (
        <Card key={title}>
          <CardHeader className="flex flex-row justify-between items-baseline gap-3">
            <CardTitle>{title}</CardTitle>
            <Skeleton className="w-6 h-6" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <TextSkeleton className="w-48" />
            <TextSkeleton className="w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
