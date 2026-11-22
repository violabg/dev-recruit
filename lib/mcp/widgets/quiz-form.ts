/**
 * Quiz form widget model: the dashboard's generation defaults of the
 * position, overridden by the parameters the assistant already knows.
 */

import { quizGenerationDefaults } from "@/lib/schemas/quiz";
import type { OpenQuizFormInput } from "@/lib/schemas";
import { links } from "../links";
import type { QuizFormWidget } from "./types";

/** Tool the assistant calls with the questions it writes */
export const QUIZ_PREVIEW_TOOL = "save_quiz_draft";

export function quizFormWidget(
  position: { id: string; title: string; experienceLevel: string; skills: string[] },
  input: OpenQuizFormInput,
): QuizFormWidget {
  const defaults = quizGenerationDefaults(position);

  return {
    kind: "quiz-form",
    position: {
      id: position.id,
      title: position.title,
      experienceLevel: position.experienceLevel,
      skills: position.skills,
    },
    prefill: {
      quizTitle: input.quizTitle?.trim() || defaults.quizTitle,
      instructions: input.instructions?.trim() || defaults.instructions || "",
      questionCount: input.questionCount ?? defaults.questionCount,
      difficulty: input.difficulty ?? defaults.difficulty,
      includeMultipleChoice: input.includeMultipleChoice ?? defaults.includeMultipleChoice,
      includeOpenQuestions: input.includeOpenQuestions ?? defaults.includeOpenQuestions,
      includeCodeSnippets: input.includeCodeSnippets ?? defaults.includeCodeSnippets,
      includeBehavioralScenarios: input.includeBehavioralScenarios ?? defaults.includeBehavioralScenarios,
      enableTimeLimit:
        input.timeLimit === undefined ? defaults.enableTimeLimit : input.timeLimit !== null,
      timeLimit: input.timeLimit ?? defaults.timeLimit,
    },
    previewTool: QUIZ_PREVIEW_TOOL,
    url: links.positionQuiz(position.id),
  };
}
