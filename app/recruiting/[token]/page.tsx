import { AssessmentClient } from "@/components/recruiting/assessment-client";
import { getAssessmentByToken } from "@/lib/data/assessments";
import { Quiz } from "@/lib/data/quizzes";
import { Suspense } from "react";
import { AssessmentSkeleton } from "./fallbacks";

// Server component for the candidate's assessment page
export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<AssessmentSkeleton />}>
      <AssessmentContent params={params} />
    </Suspense>
  );
}

async function AssessmentContent({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const assessmentParams = await params;
  const assessmentData = await getAssessmentByToken(assessmentParams.token);

  if (!assessmentData) {
    return (
      <div className="flex flex-col justify-center items-center min-h-dvh">
        <div className="bg-card shadow-lg p-6 border rounded-lg w-full max-w-md">
          <h1 className="font-bold text-2xl text-center">
            Test non trovato
          </h1>
          <p className="mt-2 text-muted-foreground text-center">
            Il link che hai seguito non è valido o il test è stato
            cancellato.
          </p>
        </div>
      </div>
    );
  }
  return (
    <AssessmentClient
      assessment={assessmentData.assessment}
      quiz={assessmentData.quiz as Quiz}
      candidate={{
        id: assessmentData.candidate.id,
        name: assessmentData.candidate.name ?? "",
        email: assessmentData.candidate.email ?? "",
      }}
    />
  );
}
