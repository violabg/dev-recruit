/**
 * AI Quiz Service
 *
 * Re-exports from modular AI service components.
 * This file provides backward compatibility - new code should import from '@/lib/services/ai'.
 *
 * Module structure:
 * - ai/types.ts - Type definitions and error classes
 * - ai/sanitize.ts - Input sanitization
 * - ai/retry.ts - Retry and timeout utilities
 * - ai/prompts.ts - Prompt builders for quizzes and questions
 * - ai/streaming.ts - Streaming utilities
 * - ai/core.ts - Main AIQuizService class
 */

// Re-export everything for backward compatibility
export {
  AIErrorCode,
  AIGenerationError,
  AIQuizService,
  DEFAULT_CONFIG,
  aiQuizService,
  sanitizeInput,
  streamPositionDescription,
  withRetry,
  withTimeout,
  type AIGenerationConfig,
  type BaseQuestionParams,
  type CodeSnippetQuestionParams,
  type GeneratePositionDescriptionParams,
  type GenerateQuestionParams,
  type GenerateQuizParams,
  type MultipleChoiceQuestionParams,
  type OpenQuestionParams,
} from "./ai";
