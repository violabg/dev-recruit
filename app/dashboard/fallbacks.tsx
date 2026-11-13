import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Stat number placeholder: same 32px line box as the real text-2xl value. */
export function StatValueSkeleton() {
  return (
    <div className="flex items-center h-8">
      <Skeleton className="w-12 h-6" />
    </div>
  );
}

/** Mirrors RecentPositions: same card header and 5 divided rows (limit 5). */
export function RecentPositionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Posizioni recenti</CardTitle>
        <CardDescription>Le ultime cinque posizioni create</CardDescription>
        <CardAction>
          <span className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Vedi tutte
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="border rounded-lg divide-y">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="px-3 py-2.5">
              <div className="flex items-center h-6">
                <Skeleton className="w-48 h-4" />
              </div>
              <div className="flex items-center h-5">
                <Skeleton className="w-24 h-3.5" />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
