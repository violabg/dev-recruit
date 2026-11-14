import type { QuestionType } from "../schemas/base";

/**
 * Question entity from database with metadata
 */
export type QuestionWithMetadata = {
  id: string;
  type: QuestionType;
  question: string;
  keywords: string[];
  explanation: string | null;
  options: string[];
  correctAnswer: number | null;
  sampleAnswer: string | null;
  codeSnippet: string | null;
  sampleSolution: string | null;
  language: string | null;
  isFavorite: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};
