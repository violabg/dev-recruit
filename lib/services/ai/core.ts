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
import {
  buildCriterionKeys,
  resolveCriterionKeys,
} from "../../utils/criterion-keys";
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
    // Criteria are listed to the AI by key (C1, C2, ...), never by id
    const keyed = buildCriterionKeys(params.criteria ?? []);
    const withCriteria = keyed.length > 0;

    const output = await generateStructured({
      task: "quiz_generation",
      schema: aiQuizGenerationSchema,
      system: buildQuizSystemPrompt(withCriteria),
      prompt: buildQuizPrompt(params, keyed),
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

    // Map the proposed keys back to criterion ids (unknown keys are dropped)
    // and remove criterionKeys from the questions
    const questions = output.questions.map(
      ({ criterionKeys, ...question }) =>
        withCriteria
          ? {
              ...question,
              criterionIds: resolveCriterionKeys(keyed, criterionKeys),
            }
          : question,
    );

    return { questions: convertToStrictQuestions(questions) };
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
