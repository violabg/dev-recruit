/**
 * AI proposal of the criteria of a position scorecard.
 *
 * Only a proposal: it never touches the database or the cache. The editor
 * shows the result as unsaved rows and saveScorecardAction stores it.
 */

import { aiScorecardGenerationSchema, type ProposedCriterion } from "../../schemas";
import { generateStructured } from "./generate";
import { buildScorecardPrompt, buildScorecardSystemPrompt } from "./prompts";

export type GenerateScorecardCriteriaParams = {
  positionTitle: string;
  experienceLevel: string;
  skills: string[];
  softSkills: string[];
  description?: string;
  /** Names of the criteria already in the scorecard (not to be proposed) */
  existingNames: string[];
  specificModel?: string;
};

const normalizeName = (name: string) => name.trim().toLowerCase();

export async function generateScorecardCriteria(
  params: GenerateScorecardCriteriaParams,
): Promise<{ criteria: ProposedCriterion[] }> {
  const output = await generateStructured({
    task: "scorecard_generation",
    schema: aiScorecardGenerationSchema,
    system: buildScorecardSystemPrompt(),
    prompt: buildScorecardPrompt(params),
    specificModel: params.specificModel,
    temperature: 0.7,
  });

  const existing = new Set(params.existingNames.map(normalizeName));

  return {
    criteria: output.criteria.filter(
      (criterion) => !existing.has(normalizeName(criterion.name)),
    ),
  };
}
