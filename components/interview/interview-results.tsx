"use client";

import { Question } from "@/lib/schemas";
import { InterviewResultsClient } from "./interview-results-client";

interface InterviewResultsProps {
  interviewId: string;
  quizQuestions: Question[];
  answers: Record<string, any>;
  candidateName: string;
}

export function InterviewResults({
  interviewId,
  quizQuestions,
  answers,
  candidateName,
}: InterviewResultsProps) {
  return (
    <InterviewResultsClient
      interviewId={interviewId}
      quizQuestions={quizQuestions}
      answers={answers}
      candidateName={candidateName}
    />
  );
}
