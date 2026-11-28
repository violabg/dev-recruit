import { TextSkeleton } from "@/components/skeletons";
import { getApplicationDetail } from "@/lib/data/applications";
import {
  buildApplicationStory,
  resolveOpenStops,
  type StoryFacts,
  type StoryStop as StoryStopModel,
} from "@/lib/utils/application-story";
import {
  allFeedbackSubmitted,
  toNextActionInterviewFacts,
} from "@/lib/utils/interview-status";
import { getNextAction, type ApplicationFacts } from "@/lib/utils/next-action";
import { connection } from "next/server";
import { Suspense } from "react";
import { DecisionStopBody } from "./decision-tab";
import { InterviewStopBody, ScheduleInterviewBody } from "./interviews-tab";
import { NextActionSection } from "./next-action-section";
import { ResumeStopBody } from "./resume-tab";
import { SendTestBody, TestStopBody } from "./assessments-tab";
import { StoryStop } from "./story-stop";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

/** Kinds whose action lives in the current stop body, not in the callout. */
const BODY_ACTION_KINDS: ReadonlySet<string> = new Set([
  "evaluate_cv",
  "send_assessment",
  "schedule_interview",
]);

function StopBodySkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <TextSkeleton className="w-40" />
      <TextSkeleton className="w-full" />
      <TextSkeleton className="w-2/3" />
    </div>
  );
}

/**
 * Vertical story of the application: one stop per CV, test, interview and the
 * decision. The current stop holds the page's next action and its single
 * primary button.
 */
export async function ApplicationStory({ params, searchParams }: Props) {
  await connection();

  const { id } = await params;
  const [detail, { tab }] = await Promise.all([
    getApplicationDetail(id),
    searchParams,
  ]);

  if (!detail) return null;

  const interviews = detail.interviews.map((interview) => ({
    id: interview.id,
    status: interview.status,
    kitStatus: interview.kitStatus,
    participantIds: interview.participantIds,
    submittedInterviewerIds: interview.submittedInterviewerIds,
  }));

  const nextActionFacts: ApplicationFacts = {
    stage: detail.stage,
    hasResume: !!detail.candidate.resumeUrl,
    hasResumeEvaluation: !!detail.resumeEvaluation,
    assessments: detail.assessments.map((assessment) => ({
      id: assessment.id,
      status: assessment.status,
      hasEvaluation: !!assessment.evaluation,
      createdAt: assessment.createdAt,
    })),
    interviews: toNextActionInterviewFacts(interviews),
    allFeedbackSubmitted: allFeedbackSubmitted(interviews),
  };

  const action = getNextAction(nextActionFacts);

  const storyFacts: StoryFacts = {
    stage: detail.stage,
    hasResume: !!detail.candidate.resumeUrl,
    resumeEvaluation: detail.resumeEvaluation
      ? { fitScore: detail.resumeEvaluation.fitScore }
      : null,
    assessments: detail.assessments.map((assessment) => ({
      id: assessment.id,
      status: assessment.status,
      quizTitle: assessment.quiz.title,
      createdAt: assessment.createdAt,
      startedAt: assessment.startedAt,
      completedAt: assessment.completedAt,
      timeLimit: assessment.quiz.timeLimit,
      quizScore: assessment.evaluation?.quizScore ?? null,
    })),
    interviews: detail.interviews.map((interview) => ({
      id: interview.id,
      round: interview.round,
      status: interview.status,
      scheduledAt: interview.scheduledAt,
      kitStatus: interview.kitStatus,
      submittedCount: interview.submittedInterviewerIds.length,
      participantCount: interview.participantIds.length,
    })),
    decision:
      detail.decision && detail.decidedAt
        ? { outcome: detail.decision, decidedAt: detail.decidedAt }
        : null,
  };

  const stops = buildApplicationStory(storyFacts, action, new Date());
  const open = new Set(resolveOpenStops(tab, stops));

  return (
    <ol
      aria-label="Storia della candidatura"
      className="relative flex flex-col gap-3 before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-0.5 before:bg-border"
    >
      {stops.map((stop) => (
        <StoryStop
          key={stop.key}
          stop={stop}
          defaultOpen={open.has(stop.key)}
        >
          <StopBody
            stop={stop}
            params={params}
            actionKind={action.kind}
            isCurrent={stop.state === "current"}
          />
        </StoryStop>
      ))}
    </ol>
  );
}

/**
 * Body of one stop. Only the current stop body can hold the primary action,
 * and only when the next action is one the body performs itself.
 */
async function StopBody({
  stop,
  params,
  actionKind,
  isCurrent,
}: {
  stop: StoryStopModel;
  params: Promise<{ id: string }>;
  actionKind: string;
  isCurrent: boolean;
}) {
  if (isCurrent) {
    return (
      <>
        <Suspense
          fallback={
            <div className="flex flex-col gap-2">
              <TextSkeleton className="w-32" />
              <TextSkeleton className="w-64" />
            </div>
          }
        >
          <NextActionSection
            params={params}
            showAction={!BODY_ACTION_KINDS.has(actionKind)}
          />
        </Suspense>
        <Suspense fallback={<StopBodySkeleton />}>
          <StopBodyContent
            stop={stop}
            params={params}
            actionKind={actionKind}
            primary
          />
        </Suspense>
      </>
    );
  }

  return (
    <Suspense fallback={<StopBodySkeleton />}>
      <StopBodyContent stop={stop} params={params} actionKind={actionKind} />
    </Suspense>
  );
}

function StopBodyContent({
  stop,
  params,
  actionKind,
  primary = false,
}: {
  stop: StoryStopModel;
  params: Promise<{ id: string }>;
  actionKind: string;
  primary?: boolean;
}) {
  switch (stop.kind) {
    case "cv":
      return (
        <ResumeStopBody
          params={params}
          primaryAction={primary && actionKind === "evaluate_cv"}
        />
      );
    case "test":
      return stop.assessmentId ? (
        <TestStopBody params={params} assessmentId={stop.assessmentId} />
      ) : (
        <SendTestBody
          params={params}
          primaryAction={primary && actionKind === "send_assessment"}
        />
      );
    case "interview":
      return stop.interviewId ? (
        <InterviewStopBody params={params} interviewId={stop.interviewId} />
      ) : (
        <ScheduleInterviewBody
          params={params}
          primaryAction={primary && actionKind === "schedule_interview"}
        />
      );
    case "decision":
      return <DecisionStopBody params={params} />;
  }
}
