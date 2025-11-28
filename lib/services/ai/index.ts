/**
 * AI Service Module Index
 *
 * Re-exports all AI service components for convenient imports.
 *
 * Usage:
 * ```ts
 * import { aiQuizService, streamPositionDescription, sanitizeInput } from '@/lib/services/ai';
 * ```
 */

// Core service
export { AIQuizService, aiQuizService } from "./core";

// Prompts
export {
  buildPositionDescriptionPrompt,
  buildQuestionPrompts,
  buildQuizPrompt,
  buildQuizSystemPrompt,
  questionPromptBuilders,
} from "./prompts";

// Retry utilities
export { withRetry, withTimeout } from "./retry";

// Sanitization
export { sanitizeInput } from "./sanitize";

// Streaming
export { streamPositionDescription } from "./streaming";

// Types
export {
  AIErrorCode,
  AIGenerationError,
  DEFAULT_CONFIG,
  type AIGenerationConfig,
  type BaseQuestionParams,
  type CodeSnippetQuestionParams,
  type GeneratePositionDescriptionParams,
  type GenerateQuestionParams,
  type GenerateQuizParams,
  type MultipleChoiceQuestionParams,
  type OpenQuestionParams,
} from "./types";
