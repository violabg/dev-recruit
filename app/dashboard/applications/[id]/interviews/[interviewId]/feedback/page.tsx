import { InterviewSteps } from "@/components/interviews/interview-steps";
import { NextStep } from "@/components/detail-blocks";
import { InterviewerFeedbackForm } from "@/components/interviews/interviewer-feedback-form";
import { SubmittedFeedbackList } from "@/components/interviews/submitted-feedback-list";
import PageHeader from "@/components/page-header";
import { FieldSkeleton, PageHeaderSkeleton } from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth-server";
import { getInterviewFeedbackPage } from "@/lib/data/interviews";
import type { InterviewerFeedbackFormData } from "@/lib/schemas";
import { buildFeedbackPrefill } from "@/lib/utils/interview-feedback";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

type FeedbackParams = Promise<{ id: string; interviewId: string }>;

export async function generateStaticParams() {
  // Cache Components requires at least one result from generateStaticParams
  return [{ id: "placeholder", interviewId: "placeholder" }];
}

/** Interviewer scorecard of an interview: never cached. */
export default function InterviewFeedbackPage({
  params,
}: {
  params: FeedbackParams;
}) {
  return (
    <Suspense fallback={<FeedbackSkeleton />}>
      <FeedbackContent params={params} />
    </Suspense>
  );
}

function FeedbackSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton section="applications" description />
      <div className="flex flex-col gap-4">
        <FieldSkeleton label="Valutazione per criterio" />
        <FieldSkeleton label="Raccomandazione finale" />
      </div>
    </div>
  );
}

async function FeedbackContent({ params }: { params: FeedbackParams }) {
  const { id, interviewId } = await params;

  // Session-dependent: read per request, never prerendered
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const page = await getInterviewFeedbackPage(interviewId, user.id);
  if (!page || page.interview.applicationId !== id) {
    notFound();
  }

  const { interview, viewerParticipant, ownFeedback, ownNotes } = page;
  const candidateName =
    `${interview.candidate.firstName} ${interview.candidate.lastName}`.trim();

  // Active criteria plus the archived ones cited by the kit, scorecard order
  const citedByKit = new Set(
    (interview.kit?.items ?? []).flatMap((item) => item.criterionIds),
  );
  const criteria = interview.criteria
    .filter((criterion) => !criterion.archived || citedByKit.has(criterion.id))
    .sort((a, b) => a.order - b.order);

  const initial: InterviewerFeedbackFormData = ownFeedback
    ? {
        hireRecommendation: ownFeedback.hireRecommendation,
        notes: ownFeedback.notes ?? "",
        redFlags: ownFeedback.redFlags,
        standoutMoments: ownFeedback.standoutMoments,
        scores: criteria.map((criterion) => {
          const stored = ownFeedback.scores.find(
            (score) => score.criterionId === criterion.id,
          );
          return {
            criterionId: criterion.id,
            score: stored?.score ?? null,
            evidence: stored?.evidence ?? "",
          };
        }),
      }
    : {
        hireRecommendation: null,
        notes: "",
        redFlags: [],
        standoutMoments: [],
        scores: buildFeedbackPrefill(criteria, ownNotes),
      };

  const viewerSubmitted = ownFeedback?.submittedAt != null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="applications"
        title="Scheda intervistatore"
        description={`${candidateName} · ${interview.position.title} · Round ${interview.round}`}
        actionBtns={
          <Link
            href={`/dashboard/applications/${id}?tab=colloqui` as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="size-4" />
            Candidatura
          </Link>
        }
      />

      <InterviewSteps
        applicationId={id}
        interviewId={interview.id}
        current="feedback"
        status={interview.status}
        feedbackSubmitted={viewerSubmitted}
      />

      {viewerSubmitted && (
        <NextStep
          title="Scheda inviata: passa alla decisione"
          description="Confronta le schede di tutti i colloqui e registra l'esito."
          href={`/dashboard/applications/${id}/decision`}
          actionLabel="Apri decisione"
        />
      )}

      {viewerParticipant ? (
        <InterviewerFeedbackForm
          interviewId={interview.id}
          criteria={criteria.map((criterion) => ({
            id: criterion.id,
            name: criterion.name,
            priority: criterion.priority,
            archived: criterion.archived,
          }))}
          initial={initial}
          submittedAt={ownFeedback?.submittedAt ?? null}
          interviewCompleted={interview.status === "completed"}
        />
      ) : (
        <p className="bg-muted px-3 py-2 rounded-md text-muted-foreground text-sm">
          Non partecipi a questo colloquio: non hai una scheda da compilare
        </p>
      )}

      <SubmittedFeedbackList
        items={page.othersSubmitted}
        criteria={interview.criteria}
        collapsed={viewerParticipant !== null && !viewerSubmitted}
      />
    </div>
  );
}
