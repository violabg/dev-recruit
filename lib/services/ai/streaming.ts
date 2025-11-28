/**
 * AI Service Streaming
 *
 * Streaming utilities for AI-generated content like position descriptions.
 */

import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { getOptimalModel } from "../../utils";
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
    const model = getOptimalModel("simple_task", params.specificModel);
    const prompt = buildPositionDescriptionPrompt(params);

    const result = streamText({
      model: groq(model),
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
