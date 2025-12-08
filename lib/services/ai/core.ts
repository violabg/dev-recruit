/**
 * AI Quiz Service - Core
 *
 * Main AI service for generating quizzes and questions.
 * Uses modular components from the ai/ directory.
 */

import { groq } from "@ai-sdk/groq";
import { generateObject, NoObjectGeneratedError } from "ai";
import {
  aiQuizGenerationSchema,
  convertToStrictQuestions,
  Question,
  questionSchemas,
} from "../../schemas";
import { getOptimalModel } from "../../utils";
import {
  buildQuestionPrompts,
  buildQuizPrompt,
  buildQuizSystemPrompt,
} from "./prompts";
import { withRetry, withTimeout } from "./retry";
import {
  AIErrorCode,
  AIGenerationConfig,
  AIGenerationError,
  DEFAULT_CONFIG,
  GenerateQuestionParams,
  GenerateQuizParams,
} from "./types";

export class AIQuizService {
  private config: AIGenerationConfig;

  constructor(config: Partial<AIGenerationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async generateQuiz(
    params: GenerateQuizParams
  ): Promise<{ questions: Question[] }> {
    try {
      const model = getOptimalModel("quiz_generation", params.specificModel);
      const prompt = buildQuizPrompt(params);

      const result = await withTimeout(
        withRetry(async () => {
          try {
            const response = await generateObject({
              model: groq(model),
              prompt,
              system: buildQuizSystemPrompt(),
              schema: aiQuizGenerationSchema,
              temperature: 0.7,
              providerOptions: {
                groq: {
                  structuredOutputs: false,
                },
              },
            });

            if (
              !response.object ||
              !response.object.questions ||
              !response.object.title
            ) {
              throw new AIGenerationError(
                "Invalid response structure from AI model",
                AIErrorCode.INVALID_RESPONSE,
                { response }
              );
            }

            return response.object;
          } catch (error) {
            if (error instanceof NoObjectGeneratedError) {
              throw new AIGenerationError(
                "AI model failed to generate valid quiz structure",
                AIErrorCode.GENERATION_FAILED,
                { originalError: error.message }
              );
            }
            throw error;
          }
        }, this.config),
        this.config.timeout
      );

      return {
        questions: convertToStrictQuestions(result.questions),
      };
    } catch (error) {
      if (error instanceof AIGenerationError) {
        throw error;
      }

      // Try fallback models if available
      if (params.specificModel && this.config.fallbackModels.length > 0) {
        for (const fallbackModel of this.config.fallbackModels) {
          if (fallbackModel !== params.specificModel) {
            try {
              return await this.generateQuiz({
                ...params,
                specificModel: fallbackModel,
              });
            } catch {
              continue;
            }
          }
        }
      }

      throw new AIGenerationError(
        "All quiz generation attempts failed",
        AIErrorCode.GENERATION_FAILED,
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  async generateQuestion(params: GenerateQuestionParams): Promise<Question> {
    try {
      const model = getOptimalModel(
        "question_generation",
        params.specificModel
      );

      // Build system and user prompts using the type-specific builder
      const { systemPrompt, userPrompt } = buildQuestionPrompts(params);

      const result = await withTimeout(
        withRetry(async () => {
          try {
            const response = await generateObject({
              model: groq(model),
              prompt: userPrompt,
              system: systemPrompt,
              schema: questionSchemas.flexible, // Use questionSchemas.flexible for single question
              temperature: 0.7,
              providerOptions: {
                groq: {
                  structuredOutputs: false,
                },
              },
            });

            if (!response.object) {
              throw new AIGenerationError(
                "Invalid response structure from AI model",
                AIErrorCode.INVALID_RESPONSE,
                { response }
              );
            }

            return response.object;
          } catch (error) {
            if (error instanceof NoObjectGeneratedError) {
              throw new AIGenerationError(
                "AI model failed to generate valid question structure",
                AIErrorCode.GENERATION_FAILED,
                { originalError: error.message }
              );
            }
            throw error;
          }
        }, this.config),
        this.config.timeout
      );

      // Convert the single question result to strict type
      if (!result || !result.question) {
        throw new AIGenerationError(
          "No question generated in response",
          AIErrorCode.INVALID_RESPONSE,
          { result }
        );
      }

      const strictQuestions = convertToStrictQuestions([result]);
      return strictQuestions[0];
    } catch (error) {
      if (error instanceof AIGenerationError) {
        throw error;
      }

      // Try fallback models if available
      if (params.specificModel && this.config.fallbackModels.length > 0) {
        for (const fallbackModel of this.config.fallbackModels) {
          if (fallbackModel !== params.specificModel) {
            try {
              return await this.generateQuestion({
                ...params,
                specificModel: fallbackModel,
              });
            } catch {
              continue;
            }
          }
        }
      }

      throw new AIGenerationError(
        "All question generation attempts failed",
        AIErrorCode.GENERATION_FAILED,
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }
}

// Export a singleton instance for use throughout the application
export const aiQuizService = new AIQuizService();
