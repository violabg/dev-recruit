import { InterviewClient } from "@/components/interview/interview-client";
import { getInterviewByToken } from "@/lib/data/interviews";
import { Quiz } from "@/lib/data/quizzes";
import { Suspense } from "react";
import { InterviewSkeleton } from "./fallbacks";

// Server component for interview page
export default async function InterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<InterviewSkeleton />}>
      <InterviewContent params={params} />
    </Suspense>
  );
}

async function InterviewContent({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const interviewParams = await params;
  const interviewData = await getInterviewByToken(interviewParams.token);

  if (!interviewData) {
    return (
      <div className="flex flex-col justify-center items-center min-h-dvh">
        <div className="bg-card shadow-lg p-6 border rounded-lg w-full max-w-md">
          <h1 className="font-bold text-2xl text-center">
            Intervista non trovata
          </h1>
          <p className="mt-2 text-muted-foreground text-center">
            Il link che hai seguito non è valido o l&apos;intervista è stata
            cancellata.
          </p>
        </div>
      </div>
    );
  }
  return (
    <InterviewClient
      interview={interviewData.interview}
      quiz={interviewData.quiz as Quiz}
      candidate={{
        id: interviewData.candidate.id,
        name: interviewData.candidate.name ?? "",
        email: interviewData.candidate.email ?? "",
      }}
    />
  );
}
