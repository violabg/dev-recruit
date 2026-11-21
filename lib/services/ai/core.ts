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
  type QuestionType,
} from "../../schemas";
import {
  buildCriterionKeys,
  resolveCriterionKeys,
} from "../../utils/criterion-keys";
import { generateStructured } from "./generate";
import { questionOutputSchema, quizOutputSchema } from "./question-output";
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

/**
 * Shuffle the options of a generated multiple choice question and move
 * correctAnswer with them: models put the right option first far more often
 * than chance. Other question types are returned unchanged.
 */
export function shuffleOptions<
  T extends { type: string; options?: string[]; correctAnswer?: number },
>(question: T, random: () => number = Math.random): T {
  const { options, correctAnswer } = question;
  if (
    question.type !== "multiple_choice" ||
    !options ||
    options.length < 2 ||
    correctAnswer === undefined ||
    correctAnswer < 0 ||
    correctAnswer >= options.length
  ) {
    return question;
  }

  const order = options.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  return {
    ...question,
    options: order.map((index) => options[index]),
    correctAnswer: order.indexOf(correctAnswer),
  };
}

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

    const types = [
      params.includeMultipleChoice && "multiple_choice",
      params.includeOpenQuestions && "open_question",
      params.includeCodeSnippets && "code_snippet",
      params.includeBehavioralScenarios && "behavioral_scenario",
    ].filter((type): type is QuestionType => Boolean(type));

    const output = await generateStructured({
      task: "quiz_generation",
      schema: aiQuizGenerationSchema,
      outputSchema: quizOutputSchema(types, withCriteria),
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
        shuffleOptions(
          withCriteria
            ? {
                ...question,
                criterionIds: resolveCriterionKeys(keyed, criterionKeys),
              }
            : question,
        ),
    );

    return { questions: convertToStrictQuestions(questions) };
  }

  async generateQuestion(params: GenerateQuestionParams): Promise<Question> {
    const { systemPrompt, userPrompt } = buildQuestionPrompts(params);

    const output = await generateStructured({
      task: "question_generation",
      schema: questionSchemas.flexible,
      outputSchema: questionOutputSchema([params.type]),
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

    return convertToStrictQuestions([shuffleOptions(output)])[0];
  }
}

// Export a singleton instance for use throughout the application
export const aiQuizService = new AIQuizService();
