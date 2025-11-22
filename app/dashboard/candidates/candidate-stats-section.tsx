import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CandidateStatusSummary,
  getCandidateStats,
} from "@/lib/data/candidates";

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const CandidateStatsSection = async () => {
  const { statusCounts, totalCandidates } = await getCandidateStats();

  return (
    <div className="gap-4 grid md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center pb-2">
          <CardTitle className="font-medium text-sm">
            Totale Candidati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{totalCandidates}</div>
        </CardContent>
      </Card>
      {statusCounts?.map((statusItem: CandidateStatusSummary) => (
        <Card key={statusItem.status}>
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="font-medium text-sm">
              {capitalize(statusItem.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{statusItem.count}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
