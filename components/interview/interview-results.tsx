"use client";

import type { EvaluationWithRelations } from "@/lib/data/evaluations";
import { FlexibleQuestion } from "@/lib/schemas";
import { InterviewResultsClient } from "./interview-results-client";

interface InterviewResultsProps {
  interviewId: string;
  quizQuestions: FlexibleQuestion[];
  answers: Record<string, any>;
  candidateName: string;
  initialEvaluation?: EvaluationWithRelations | null;
}

export function InterviewResults({
  interviewId,
  quizQuestions,
  answers,
  candidateName,
  initialEvaluation,
}: InterviewResultsProps) {
  return (
    <InterviewResultsClient
      interviewId={interviewId}
      quizQuestions={quizQuestions}
      answers={answers}
      candidateName={candidateName}
      initialEvaluation={initialEvaluation}
    />
  );
}
