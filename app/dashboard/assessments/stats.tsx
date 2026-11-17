import { AssessmentPipeline } from "@/components/dashboard/assessment-pipeline";
import { getAssessmentsStatus } from "@/lib/data/assessments";
import { AssessmentStatus } from "@/lib/schemas";

export type AssessmentsSearchParams = {
  search?: string;
  status?: AssessmentStatus | "all";
  position?: string;
  language?: string;
  page?: string;
};

/** Status overview as the shared assessment pipeline (stages filter the list). */
export const Stats = async () => {
  const statusCounts = await getAssessmentsStatus();
  return <AssessmentPipeline counts={statusCounts} />;
};
