/**
 * AI Quiz Service - Core
 *
 * Quiz and question generation. Model choice, retry, timeout and fallback
 * live in ./generate; this module only supplies prompts and schemas.
 */

import {
  aiQuizGenerationSchema,
  convertToStrictQuestions,
  Question,
  questionSchemas,
} from "../../schemas";
import { generateStructured } from "./generate";
import {
  buildQuestionPrompts,
  buildQuizPrompt,
  buildQuizSystemPrompt,
} from "./prompts";
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
    params: GenerateQuizParams,
  ): Promise<{ questions: Question[] }> {
    const output = await generateStructured({
      task: "quiz_generation",
      schema: aiQuizGenerationSchema,
      system: buildQuizSystemPrompt(),
      prompt: buildQuizPrompt(params),
      specificModel: params.specificModel,
      temperature: 0.7,
      config: this.config,
    });

    if (!output.questions || !output.title) {
      throw new AIGenerationError(
        "Invalid response structure from AI model",
        AIErrorCode.INVALID_RESPONSE,
        { output },
      );
    }

    return { questions: convertToStrictQuestions(output.questions) };
  }

  async generateQuestion(params: GenerateQuestionParams): Promise<Question> {
    const { systemPrompt, userPrompt } = buildQuestionPrompts(params);

    const output = await generateStructured({
      task: "question_generation",
      schema: questionSchemas.flexible,
      system: systemPrompt,
      prompt: userPrompt,
      specificModel: params.specificModel,
      temperature: 0.7,
      config: this.config,
    });

    if (!output.question) {
      throw new AIGenerationError(
        "No question generated in response",
        AIErrorCode.INVALID_RESPONSE,
        { output },
      );
    }

    return convertToStrictQuestions([output])[0];
  }
}

// Export a singleton instance for use throughout the application
export const aiQuizService = new AIQuizService();
