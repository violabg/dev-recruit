/**
 * AI Service Streaming
 *
 * Streaming utilities for AI-generated content like position descriptions.
 */

import { devToolsMiddleware } from "@ai-sdk/devtools";
import { groq } from "@ai-sdk/groq";
import { streamText, wrapLanguageModel } from "ai";
import { getOptimalModel, isDevelopment } from "../../utils";
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
    const aiModel = groq(getOptimalModel("simple_task", params.specificModel));

    const devToolsEnabledModel = wrapLanguageModel({
      model: aiModel,
      middleware: devToolsMiddleware(),
    });
    const prompt = buildPositionDescriptionPrompt(params);

    const result = streamText({
      model: isDevelopment ? devToolsEnabledModel : aiModel,
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
