/**
 * Request the quiz form widget sends to the assistant: the generation
 * parameters a person chose, and the tool that shows the preview. No
 * imports: the browser bundle draws it.
 */

import type { QuizFormWidget } from "./types";

const DIFFICULTY = ["molto facile", "facile", "media", "difficile", "molto difficile"];

const QUESTION_TYPES = [
  ["includeMultipleChoice", "risposta multipla (multiple_choice)"],
  ["includeOpenQuestions", "domande aperte (open_question)"],
  ["includeCodeSnippets", "snippet di codice (code_snippet)"],
  ["includeBehavioralScenarios", "scenari comportamentali (behavioral_scenario)"],
] as const;

export type QuizRequestValues = QuizFormWidget["prefill"];

/** Question types chosen, in the order of the form */
export const chosenQuestionTypes = (values: QuizRequestValues) =>
  QUESTION_TYPES.filter(([key]) => values[key]).map(([, label]) => label);

export function quizRequest(
  position: QuizFormWidget["position"],
  values: QuizRequestValues,
  previewTool: string,
): string {
  const instructions = values.instructions.trim();
  return [
    `Genera un quiz per la posizione "${position.title}" (${position.experienceLevel}, positionId ${position.id}) con questi parametri:`,
    `- titolo: "${values.quizTitle.trim()}"`,
    `- ${values.questionCount} domande, difficoltà ${values.difficulty}/5 (${DIFFICULTY[values.difficulty - 1] ?? "media"})`,
    `- tipi di domande: ${chosenQuestionTypes(values).join(", ")}`,
    values.enableTimeLimit
      ? `- limite di tempo: ${values.timeLimit} minuti`
      : "- nessun limite di tempo",
    instructions && `- istruzioni: ${instructions}`,
    `Basa le domande sulle competenze della posizione${position.skills.length ? ` (${position.skills.join(", ")})` : ""} e sui criteri della sua scheda di valutazione (get_position).`,
    `Poi mostrami l'anteprima con ${previewTool} (timeLimit ${values.enableTimeLimit ? values.timeLimit : "null"}): la salvo io dal riquadro.`,
  ]
    .filter(Boolean)
    .join("\n");
}
