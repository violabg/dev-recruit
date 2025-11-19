import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Quiz } from "./quizzes-actions";

/**
 * QuizzesStatisticsSection - Cached statistics display
 * - Shows total quiz count and breakdown by position
 * - Revalidates with "quizzes" tag when quizzes are created/deleted
 */
export async function QuizzesStatisticsSection({
  quizzes,
  positionCounts,
}: {
  quizzes: Quiz[];
  positionCounts: {
    position_id: string;
    position_title: string;
    count: number;
  }[];
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Statistiche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Quiz totali:</span>
              <span className="font-medium">{quizzes?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Quiz inviati:</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span>Quiz completati:</span>
              <span className="font-medium">0</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiz per posizione</CardTitle>
        </CardHeader>
        <CardContent>
          {positionCounts && positionCounts.length > 0 ? (
            <div className="space-y-2">
              {positionCounts.map((item) => (
                <div key={item.position_id} className="flex justify-between">
                  <span className="truncate">{item.position_title}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nessun dato disponibile
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Azioni rapide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button className="justify-start w-full" variant="outline" asChild>
              <Link href="/dashboard/positions">Crea nuovo quiz</Link>
            </Button>
            <Button className="justify-start w-full" variant="outline" asChild>
              <Link href="/dashboard/candidates">Gestisci candidati</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
