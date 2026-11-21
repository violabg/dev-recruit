/**
 * AI generation: the one place that talks to the model provider.
 *
 * Owns model choice, the dev-tools middleware, retry, timeout and the
 * fallback chain, so every caller gets the same failure policy:
 *   1. the primary model, retried with exponential backoff;
 *   2. then each fallback model once.
 * Each attempt is bounded by the configured timeout.
 *
 * Output mode: strict structured outputs (the model is constrained to the
 * JSON schema, see ./strict-schema). When the provider rejects the request
 * (HTTP 400, e.g. a schema it does not support), the same model is asked
 * once more in JSON mode, where the prompt alone describes the shape.
 */

import { groq } from "@ai-sdk/groq";
import {
  APICallError,
  generateText,
  NoObjectGeneratedError,
  Output,
  wrapLanguageModel,
} from "ai";
import type { z } from "zod";
import { isDevelopment } from "../../utils";
import { aiLogger } from "../logger";
import { getOptimalModel, type LLMTaskType } from "./models";
import { withRetry, withTimeout } from "./retry";
import { strictOutputSchema } from "./strict-schema";
import {
  AIErrorCode,
  AIGenerationConfig,
  AIGenerationError,
  DEFAULT_CONFIG,
} from "./types";

/**
 * Resolve a model id to a provider model, wrapped with the AI SDK dev tools
 * in development.
 */
export async function getLanguageModel(modelId: string) {
  const model = groq(modelId);
  if (!isDevelopment) return model;

  const { devToolsMiddleware } = await import("@ai-sdk/devtools");
  return wrapLanguageModel({ model, middleware: devToolsMiddleware() });
}

export type GenerateStructuredParams<TSchema extends z.ZodType> = {
  /** Selects the default model for the job */
  task: LLMTaskType;
  /** Validates the model output (with every check of the schema) */
  schema: TSchema;
  /**
   * Shape sent to the model in strict mode, when it must be narrower than
   * `schema` (for example one variant per question type). Defaults to
   * `schema`.
   */
  outputSchema?: z.ZodType;
  system: string;
  prompt: string;
  /** Overrides the task's default model (it still falls back on failure) */
  specificModel?: string;
  temperature?: number;
  /** Fixed seed for reproducible output (evaluations) */
  seed?: number;
  config?: Partial<AIGenerationConfig>;
};

type OutputMode = "strict" | "json";

async function requestOnce<TSchema extends z.ZodType>(
  modelId: string,
  params: GenerateStructuredParams<TSchema>,
  mode: OutputMode,
): Promise<z.infer<TSchema>> {
  const { output } = await generateText({
    model: await getLanguageModel(modelId),
    prompt: params.prompt,
    system: params.system,
    output:
      mode === "strict"
        ? Output.object({
            schema: strictOutputSchema(params.schema, params.outputSchema),
          })
        : Output.object({ schema: params.schema }),
    temperature: params.temperature ?? 0.7,
    ...(params.seed !== undefined && { seed: params.seed }),
    providerOptions: {
      groq:
        mode === "strict"
          ? { structuredOutputs: true, strictJsonSchema: true }
          : { structuredOutputs: false },
    },
  });

  if (!output) {
    throw new AIGenerationError(
      "Invalid response structure from AI model",
      AIErrorCode.INVALID_RESPONSE,
      { modelId },
    );
  }

  return output as z.infer<TSchema>;
}

async function generateOnce<TSchema extends z.ZodType>(
  modelId: string,
  params: GenerateStructuredParams<TSchema>,
): Promise<z.infer<TSchema>> {
  try {
    try {
      return await requestOnce(modelId, params, "strict");
    } catch (error) {
      if (!APICallError.isInstance(error) || error.statusCode !== 400) {
        throw error;
      }
      aiLogger.warn("Strict structured output refused, retrying in JSON mode", {
        task: params.task,
        modelId,
        error: error.message,
      });
      return await requestOnce(modelId, params, "json");
    }
  } catch (error) {
    if (error instanceof NoObjectGeneratedError) {
      throw new AIGenerationError(
        "AI model failed to generate a valid structure",
        AIErrorCode.GENERATION_FAILED,
        { originalError: error.message, modelId },
      );
    }
    throw error;
  }
}

/**
 * Generate an object matching `schema`.
 * Throws AIGenerationError when the primary model and every fallback fail.
 */
export async function generateStructured<TSchema extends z.ZodType>(
  params: GenerateStructuredParams<TSchema>,
): Promise<z.infer<TSchema>> {
  const config = { ...DEFAULT_CONFIG, ...params.config };
  const primary = getOptimalModel(params.task, params.specificModel);
  const modelIds = [
    primary,
    ...config.fallbackModels.filter((modelId) => modelId !== primary),
  ];

  let lastError: unknown;

  for (const [index, modelId] of modelIds.entries()) {
    const attempt = () => generateOnce(modelId, params);
    try {
      return await withTimeout(
        index === 0 ? withRetry(attempt, config) : attempt(),
        config.timeout,
      );
    } catch (error) {
      lastError = error;

      // Blocked content will be blocked on every model: do not fall back
      if (
        error instanceof AIGenerationError &&
        error.code === AIErrorCode.CONTENT_FILTERED
      ) {
        throw error;
      }

      aiLogger.warn("AI generation failed, trying next model", {
        task: params.task,
        modelId,
        hasFallback: index < modelIds.length - 1,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (lastError instanceof AIGenerationError) {
    throw lastError;
  }

  throw new AIGenerationError(
    "All AI generation attempts failed",
    AIErrorCode.GENERATION_FAILED,
    {
      originalError:
        lastError instanceof Error ? lastError.message : String(lastError),
    },
  );
}

/**
 * User-facing (Italian) message for a failed AI generation.
 */
export function describeAIError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("rate limit") ||
    (error instanceof AIGenerationError &&
      (error.code === AIErrorCode.RATE_LIMITED ||
        error.code === AIErrorCode.QUOTA_EXCEEDED))
  ) {
    return "Limite di richieste raggiunto. Riprova tra qualche minuto.";
  }

  if (
    error instanceof AIGenerationError &&
    error.code === AIErrorCode.TIMEOUT
  ) {
    return "Il servizio AI non ha risposto in tempo. Riprova.";
  }

  return "Servizio AI temporaneamente non disponibile. Riprova più tardi.";
}
