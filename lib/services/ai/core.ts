/**
 * AI Quiz Service - Core
 *
 * Quiz and question generation. Model choice, retry, timeout and fallback
 * live in ./generate; this module only supplies prompts and schemas.
 */

import {
  aiQuizGenerationSchema,
  convertToStrictQuestions,
  FlexibleQuestion,
  Question,
  questionSchemas,
  type QuestionType,
} from "../../schemas";
import {
  buildCriterionKeys,
  resolveCriterionKeys,
} from "../../utils/criterion-keys";
import { aiLogger } from "../logger";
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

/**
 * Rounds of quiz generation: the first request plus the top-ups of a short
 * answer. The model may stop before the requested count (see `generateQuiz`).
 */
const MAX_QUIZ_ROUNDS = 3;

/**
 * Completion budget of one quiz generation: reasoning tokens plus the
 * longest quiz (20 questions with code snippets).
 */
const QUIZ_MAX_OUTPUT_TOKENS = 16000;

/** Completion budget of one question: reasoning plus the longest question. */
const QUESTION_MAX_OUTPUT_TOKENS = 4000;

/** Comparison key of a question text, to spot repeated questions. */
const questionKey = (text: string) => text.trim().toLowerCase();

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

    const questions: FlexibleQuestion[] = [];
    const asked = new Set<string>();

    // The model can answer with fewer questions than requested (it runs out
    // of output tokens, or it stops early): ask again for the missing ones,
    // listing what was already generated so the new questions cover
    // different concepts.
    for (let round = 0; round < MAX_QUIZ_ROUNDS; round++) {
      const missing = params.questionCount - questions.length;
      if (missing <= 0) break;

      const request: GenerateQuizParams = {
        ...params,
        questionCount: missing,
        previousQuestions: [
          ...(params.previousQuestions ?? []),
          ...questions.map((question) => ({ question: question.question })),
        ],
      };

      const output = await generateStructured({
        task: "quiz_generation",
        schema: aiQuizGenerationSchema,
        outputSchema: quizOutputSchema(types, withCriteria),
        system: buildQuizSystemPrompt(withCriteria),
        prompt: buildQuizPrompt(request, keyed),
        specificModel: params.specificModel,
        temperature: 0.7,
        maxOutputTokens: QUIZ_MAX_OUTPUT_TOKENS,
        config: this.config,
      });

      if (!output.questions || !output.title) {
        throw new AIGenerationError(
          "Invalid response structure from AI model",
          AIErrorCode.INVALID_RESPONSE,
          { output },
        );
      }

      // Map the proposed keys back to criterion ids (unknown keys are
      // dropped) and remove criterionKeys from the questions
      const generated: FlexibleQuestion[] = output.questions.map(
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

      // Repeated questions do not bring the quiz closer to the count: a
      // round that adds none is the last one.
      const added = generated.filter(({ question }) => {
        const key = questionKey(question);
        if (asked.has(key)) return false;
        asked.add(key);
        return true;
      });
      if (added.length === 0) break;
      questions.push(...added);
    }

    if (questions.length < params.questionCount) {
      aiLogger.warn("Quiz generated with fewer questions than requested", {
        requested: params.questionCount,
        generated: questions.length,
      });
    }

    return {
      questions: convertToStrictQuestions(
        questions.slice(0, params.questionCount),
      ),
    };
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
      maxOutputTokens: QUESTION_MAX_OUTPUT_TOKENS,
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
