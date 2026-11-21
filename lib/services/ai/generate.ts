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
 * (HTTP 400), the same model is asked once more in JSON mode, where the
 * prompt alone describes the shape. A rejected *generation* (the constrained
 * decoder produces invalid JSON now and then on long outputs) is retried
 * once in strict mode first: the schema is fine and JSON mode is slower.
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
  /**
   * Completion budget of one attempt. Without it the provider applies its
   * own default, which reasoning tokens can use up before the answer is
   * written (a long quiz comes back cut in half).
   */
  maxOutputTokens?: number;
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
  maxOutputTokens: number,
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
    maxOutputTokens,
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

/**
 * The provider rejected the generated JSON itself (the constrained decoder
 * can drop a brace on long arrays), not the schema. Only this error is worth
 * a second strict attempt: a schema the provider refuses would fail again.
 */
function isInvalidGeneratedJson(error: APICallError): boolean {
  if (!error.responseBody) return false;
  try {
    const body = JSON.parse(error.responseBody) as {
      error?: { code?: string };
    };
    return body.error?.code === "json_validate_failed";
  } catch {
    return error.message.includes("Failed to generate JSON");
  }
}

async function generateOnce<TSchema extends z.ZodType>(
  modelId: string,
  params: GenerateStructuredParams<TSchema>,
  maxOutputTokens: number,
): Promise<z.infer<TSchema>> {
  const fallbackToJson = (failure: APICallError) => {
    aiLogger.warn("Strict structured output refused, retrying in JSON mode", {
      task: params.task,
      modelId,
      error: failure.message,
    });
    return requestOnce(modelId, params, "json", maxOutputTokens);
  };

  try {
    try {
      return await requestOnce(modelId, params, "strict", maxOutputTokens);
    } catch (error) {
      if (!APICallError.isInstance(error) || error.statusCode !== 400) {
        throw error;
      }

      // Long constrained generations fail now and then: retry strict mode
      // once, it usually succeeds, instead of paying the JSON-mode fallback
      // (slower and without the schema)
      if (isInvalidGeneratedJson(error)) {
        try {
          return await requestOnce(
            modelId,
            params,
            "strict",
            maxOutputTokens,
          );
        } catch (retryError) {
          if (
            APICallError.isInstance(retryError) &&
            retryError.statusCode === 400
          ) {
            return await fallbackToJson(retryError);
          }
          throw retryError;
        }
      }

      return await fallbackToJson(error);
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
  const maxOutputTokens = params.maxOutputTokens ?? config.maxOutputTokens;
  const primary = getOptimalModel(params.task, params.specificModel);
  const modelIds = [
    primary,
    ...config.fallbackModels.filter((modelId) => modelId !== primary),
  ];

  let lastError: unknown;

  for (const [index, modelId] of modelIds.entries()) {
    const attempt = () => generateOnce(modelId, params, maxOutputTokens);
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
