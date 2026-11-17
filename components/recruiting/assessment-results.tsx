"use client";

import type { EvaluationWithRelations } from "@/lib/data/evaluations";
import { SavedQuestion } from "@/lib/schemas";
import { AssessmentResultsClient } from "./assessment-results-client";

interface AssessmentResultsProps {
  assessmentId: string;
  quizQuestions: SavedQuestion[];
  answers: Record<string, any>;
  candidateName: string;
  initialEvaluation?: EvaluationWithRelations | null;
}

export function AssessmentResults({
  assessmentId,
  quizQuestions,
  answers,
  candidateName,
  initialEvaluation,
}: AssessmentResultsProps) {
  return (
    <AssessmentResultsClient
      assessmentId={assessmentId}
      quizQuestions={quizQuestions}
      answers={answers}
      candidateName={candidateName}
      initialEvaluation={initialEvaluation}
    />
  );
}
