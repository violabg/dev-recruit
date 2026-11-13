import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Count placeholder: same 32px line box as the real text-2xl value. */
export function StatValueSkeleton() {
  return (
    <span className="flex items-center h-8">
      <Skeleton className="w-8 h-6" />
    </span>
  );
}

/** Mirrors RecentPositions: same card header and 5 rows (limit 5). */
export function RecentPositionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Posizioni recenti</CardTitle>
        <CardAction>
          <span className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Vedi tutte
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="-mx-2">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="px-2 py-2.5">
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
