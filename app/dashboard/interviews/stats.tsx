import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInterviews } from "@/lib/actions/interviews";
import { InterviewStatus } from "@/lib/schemas";
import { STATUS_CONFIG } from "./runtime-section";

export type InterviewsSearchParams = {
  search?: string;
  status?: InterviewStatus | "all";
  position?: string;
  language?: string;
  page?: string;
};

export const Stats = async () => {
  const { statusCounts } = await getInterviews();

  return (
    <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {Object.entries(STATUS_CONFIG).map(([key, config]) => {
        const count = statusCounts[key as InterviewStatus] ?? 0;
        const Icon = config.icon;

        return (
          <Card key={key} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {config.label}
              </CardTitle>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{count}</div>
              <p className="text-muted-foreground text-xs">
                {count === 1 ? "colloquio" : "colloqui"}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
