import { InterviewPipeline } from "@/components/dashboard/interview-pipeline";
import { getInteviewsStatus } from "@/lib/data/interviews";
import { InterviewStatus } from "@/lib/schemas";

export type InterviewsSearchParams = {
  search?: string;
  status?: InterviewStatus | "all";
  position?: string;
  language?: string;
  page?: string;
};

/** Status overview as the shared interview pipeline (stages filter the list). */
export const Stats = async () => {
  const statusCounts = await getInteviewsStatus();
  return <InterviewPipeline counts={statusCounts} />;
};
