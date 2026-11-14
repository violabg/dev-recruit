/**
 * AI Service Streaming
 *
 * Streaming utilities for AI-generated content like position descriptions.
 */

import { streamText } from "ai";
import { getLanguageModel } from "./generate";
import { getOptimalModel } from "./models";
import { buildPositionDescriptionPrompt } from "./prompts";
import {
  AIErrorCode,
  AIGenerationError,
  GeneratePositionDescriptionParams,
} from "./types";

/**
 * Stream a position description from the AI model
 */
export async function streamPositionDescription(
  params: GeneratePositionDescriptionParams
) {
  try {
    const model = await getLanguageModel(
      getOptimalModel("simple_task", params.specificModel),
    );

    const prompt = buildPositionDescriptionPrompt(params);

    const result = streamText({
      model,
      prompt,
      temperature: 0.7,
    });

    return result;
  } catch (error) {
    throw new AIGenerationError(
      "Failed to stream position description",
      AIErrorCode.GENERATION_FAILED,
      {
        originalError: error instanceof Error ? error.message : String(error),
      }
    );
  }
}
