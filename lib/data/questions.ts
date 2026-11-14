import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import prisma from "../prisma";
import type { QuestionType } from "../schemas/base";
import { CacheTags } from "../utils/cache-utils";

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

/**
 * Favorite questions, most recent first. Cached: the quiz editor receives the
 * promise from the server render and a favorite toggle expires QUESTIONS.
 */
export const getFavoriteQuestions = cache(
  async (): Promise<QuestionWithMetadata[]> => {
    "use cache";
    cacheLife("hours");
    cacheTag(CacheTags.QUESTIONS);

    const questions = await prisma.question.findMany({
      where: { isFavorite: true },
      orderBy: { createdAt: "desc" },
    });

    return questions as QuestionWithMetadata[];
  },
);
