import { Suspense } from "react";
import { getPositionSetupStatus } from "@/lib/data/positions";
import type { SetupPart } from "@/lib/utils/position-setup";
import { Guides } from "./guides";
import Quizzes from "./quizzes";
import { ScorecardSummary } from "./scorecard-summary";
import { CoverageTable } from "./coverage-table";
import {
  CoverageTableSkeleton,
  PositionGuidesSkeleton,
  PositionQuizzesSkeleton,
  PositionScorecardSkeleton,
} from "../fallbacks";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * "Criteri e domande" tab: criteria, their coverage, tests and traces. When
 * the setup is incomplete the creation link of the first missing part is the
 * page's single primary button.
 */
export async function CriteriaAndQuestions({ params }: Props) {
  const { id } = await params;
  const setup = await getPositionSetupStatus(id);
  const primary: SetupPart | null =
    setup && !setup.complete ? (setup.missing[0] ?? null) : null;

  return (
    <div className="flex flex-col gap-10">
      <Suspense fallback={<PositionScorecardSkeleton />}>
        <ScorecardSummary
          params={params}
          primary={primary === "scorecard"}
        />
      </Suspense>

      <Suspense fallback={<CoverageTableSkeleton />}>
        <CoverageTable params={params} />
      </Suspense>

      <Suspense fallback={<PositionQuizzesSkeleton />}>
        <Quizzes params={params} primary={primary === "quiz"} />
      </Suspense>

      <Suspense fallback={<PositionGuidesSkeleton />}>
        <Guides params={params} primary={primary === "guide"} />
      </Suspense>
    </div>
  );
}
