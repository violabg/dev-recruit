/**
 * AI generation of an interview guide from the scorecard of a position.
 *
 * Only a proposal: it never touches the database or the cache. The editor
 * shows the result as unsaved changes and upsertInterviewGuideAction stores it.
 */

import {
  aiInterviewGuideGenerationSchema,
  type GeneratedInterviewGuide,
} from "../../schemas";
import {
  buildCriterionKeys,
  resolveCriterionKeys,
} from "../../utils/criterion-keys";
import type { ActiveCriterion } from "../scorecards";
import { generateStructured } from "./generate";
import { buildGuidePrompt, buildGuideSystemPrompt } from "./prompts";

export type GenerateInterviewGuideParams = {
  positionTitle: string;
  experienceLevel: string;
  description?: string;
  title: string;
  round: number;
  durationMinutes: number;
  instructions?: string;
  criteria: ActiveCriterion[];
  specificModel?: string;
};

export async function generateInterviewGuide(
  params: GenerateInterviewGuideParams,
): Promise<GeneratedInterviewGuide> {
  // Criteria are listed to the AI by key (C1, C2, ...), never by id
  const keyed = buildCriterionKeys(params.criteria);

  const output = await generateStructured({
    task: "guide_generation",
    schema: aiInterviewGuideGenerationSchema,
    system: buildGuideSystemPrompt(),
    prompt: buildGuidePrompt(params, keyed),
    specificModel: params.specificModel,
    temperature: 0.7,
  });

  return {
    sections: output.sections.map((section) => ({
      title: section.title,
      // The sum is not corrected: the editor shows it beside the duration
      minutes: Math.max(1, Math.round(section.minutes)),
      kind: section.kind,
      questions: section.questions.map((question) => ({
        text: question.text,
        followUps: question.followUps,
        // Unknown keys are dropped
        criterionIds: resolveCriterionKeys(keyed, question.criterionKeys),
        anchors: question.anchors,
        required: question.required,
      })),
    })),
  };
}
