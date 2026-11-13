import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

/**
 * Mirrors the stat cards in page.tsx: static title/icon/caption are rendered
 * for real, only the count (text-2xl, 32px line) is a skeleton.
 */
export function DashboardStatsSkeleton({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center pb-2">
        <CardTitle className="font-medium text-sm">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center h-8">
          <Skeleton className="w-12 h-7" />
        </div>
        <p className="text-muted-foreground text-xs">{description}</p>
      </CardContent>
    </Card>
  );
}

/** Mirrors RecentPositions: same card header and 5 linked rows (limit 5). */
export function RecentPositionsSkeleton() {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Posizioni Recenti</CardTitle>
        <CardDescription>Le ultime posizioni create</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="px-3 py-2 border rounded-lg">
              <div className="flex items-center h-6">
                <Skeleton className="w-48 h-4" />
              </div>
              <div className="flex items-center h-5">
                <Skeleton className="w-24 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
