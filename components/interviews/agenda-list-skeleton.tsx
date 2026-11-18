import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors AgendaList: one card per day group, each row with the time, the
 * interview title, its meta line with badges, the participants and the two
 * actions. The agenda renders cards, so the fallback is a card list and not
 * the table it used to be.
 */
export function AgendaListSkeleton({
  groups = 1,
  rows = 2,
}: {
  groups?: number;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {Array.from({ length: groups }, (_, group) => (
        <Card key={group}>
          <CardHeader>
            <div className="flex items-center h-7">
              <Skeleton className="w-40 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {Array.from({ length: rows }, (_, row) => (
                <li
                  key={row}
                  className="flex lg:flex-row flex-col lg:items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center w-14 h-5 shrink-0">
                    <Skeleton className="w-10 h-3.5" />
                  </div>
                  <div className="flex flex-col flex-1 gap-1 min-w-0">
                    <div className="flex items-center h-5">
                      <Skeleton className="w-64 max-w-full h-3.5" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 h-5">
                      <Skeleton className="rounded-lg w-28 h-5" />
                      <Skeleton className="rounded-lg w-20 h-5" />
                      <Skeleton className="rounded-lg w-24 h-5" />
                    </div>
                    <div className="flex items-center h-5">
                      <Skeleton className="w-56 max-w-full h-3.5" />
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Skeleton className="rounded-lg w-24 h-7" />
                    <Skeleton className="rounded-lg w-20 h-7" />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
