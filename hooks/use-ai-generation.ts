"use client";

import { generateNewQuestionAction } from "@/lib/actions/quizzes";
import { FlexibleQuestion, QuestionType } from "@/lib/schemas";
import { GenerateQuestionParams } from "@/lib/services/ai-service";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import {
  createBehavioralScenarioParams,
  createCodeSnippetParams,
  createMultipleChoiceParams,
  createOpenQuestionParams,
} from "@/lib/utils/question-prompt-helpers";
import { generateId } from "ai";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { EditQuizFormData } from "./use-edit-quiz-form";

type Question = FlexibleQuestion;

type UseAIGenerationProps = {
  form: UseFormReturn<EditQuizFormData>;
  fields: Question[];
  position: {
    id: string;
    title: string;
    experienceLevel: string;
    skills: string[];
  };
  prepend: (value: Question) => void;
  append: (value: Question) => void;
  remove: (index: number) => void;
  update: (index: number, value: Question) => void;
  setExpandedQuestions: (
    value: Set<string> | ((prev: Set<string>) => Set<string>),
  ) => void;
};

export type GenerationOptions = {
  instructions?: string;
  llmModel: string;
  difficulty?: number;
  // Type-specific options
  focusAreas?: string[];
  distractorComplexity?: "simple" | "moderate" | "complex";
  expectedResponseLength?: "short" | "medium" | "long";
  evaluationCriteria?: string[];
  language?: string;
  bugType?: "syntax" | "logic" | "performance" | "security";
  codeComplexity?: "basic" | "intermediate" | "advanced";
  includeComments?: boolean;
};

/**
 * AI generation of single questions inside the quiz editor.
 * Generated questions are added to the form only: nothing is saved until the
 * user saves the quiz.
 */
export const useAIGeneration = ({
  form,
  fields,
  position,
  prepend,
  update,
  setExpandedQuestions,
}: UseAIGenerationProps) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [generatingQuestionType, setGeneratingQuestionType] =
    useState<QuestionType | null>(null);
  const [regeneratingQuestionIndex, setRegeneratingQuestionIndex] = useState<
    number | null
  >(null);

  /** Programming language suggested by the position's skills */
  const inferLanguageFromSkills = (): string => {
    const skills = position.skills.map((skill) => skill.toLowerCase());
    const has = (...needles: string[]) =>
      skills.some((skill) => needles.some((needle) => skill.includes(needle)));

    if (has("javascript", "react", "node")) return "javascript";
    if (has("typescript")) return "typescript";
    if (has("python")) return "python";
    if (has("java")) return "java";
    if (has("c#", "csharp")) return "csharp";
    if (has("php")) return "php";
    return "javascript";
  };

  /** Build the generation request for a question type and its options */
  const buildParams = (
    type: QuestionType,
    options: GenerationOptions,
  ): GenerateQuestionParams => {
    // The title is only required to save a quiz: generation must work on a new
    // quiz too, so fall back to the standard position-based title.
    const quizTitle =
      form.getValues("title")?.trim() ||
      `Test per ${position.title} (${position.experienceLevel})`;

    const baseConfig = {
      quizTitle,
      positionTitle: position.title,
      experienceLevel: position.experienceLevel,
      skills: position.skills,
      previousQuestions: fields.map((field) => ({
        question: field.question,
        type: field.type,
      })),
    };

    let params: GenerateQuestionParams;
    switch (type) {
      case "multiple_choice":
        params = createMultipleChoiceParams(baseConfig, {
          focusAreas: options.focusAreas ?? undefined,
          distractorComplexity: options.distractorComplexity || "moderate",
        });
        break;
      case "open_question":
        params = createOpenQuestionParams(baseConfig, {
          expectedResponseLength: options.expectedResponseLength || "medium",
          evaluationCriteria: options.evaluationCriteria ?? undefined,
        });
        break;
      case "code_snippet":
        params = createCodeSnippetParams(baseConfig, {
          language: options.language || inferLanguageFromSkills(),
          bugType: options.bugType ?? undefined,
          codeComplexity: options.codeComplexity || "intermediate",
          includeComments: options.includeComments ?? true,
        });
        break;
      case "behavioral_scenario":
        params = createBehavioralScenarioParams(baseConfig, {
          expectedResponseLength: options.expectedResponseLength || "medium",
          evaluationCriteria: options.evaluationCriteria,
        });
        break;
      default:
        throw new Error("Tipo di domanda non supportato");
    }

    if (options.difficulty) params.difficulty = options.difficulty;
    if (options.instructions) params.instructions = options.instructions;
    if (options.llmModel) params.specificModel = options.llmModel;

    return params;
  };

  /** Generate a new question and add it at the top of the list */
  const handleGenerateQuestion = async (
    type: QuestionType,
    options: GenerationOptions,
  ) => {
    setAiLoading(true);
    setGeneratingQuestionType(type);

    try {
      const { question } = unwrap(
        await generateNewQuestionAction(buildParams(type, options)),
      );
      const newQuestion = { ...question, id: generateId() };

      prepend(newQuestion);
      setExpandedQuestions((prev) => new Set([...prev, newQuestion.id]));

      toast.success("Domanda generata con successo!");
      setGeneratingQuestionType(null);
    } catch (error) {
      toast.error("Errore di generazione", {
        description: errorMessage(
          error,
          "Errore durante la generazione della domanda",
        ),
      });
    } finally {
      setAiLoading(false);
    }
  };

  /** Replace the question being regenerated, keeping its database link */
  const handleRegenerateQuestion = async (
    type: QuestionType,
    options: GenerationOptions,
  ) => {
    if (regeneratingQuestionIndex === null) return;

    setAiLoading(true);

    try {
      const currentQuestion = fields[regeneratingQuestionIndex];
      const { question } = unwrap(
        await generateNewQuestionAction(buildParams(type, options)),
      );

      update(regeneratingQuestionIndex, {
        ...question,
        dbId: currentQuestion.dbId,
      });

      toast.success("Domanda rigenerata con successo!");
      setRegeneratingQuestionIndex(null);
    } catch (error) {
      toast.error("Errore di rigenerazione", {
        description: errorMessage(
          error,
          "Errore durante la rigenerazione della domanda",
        ),
      });
    } finally {
      setAiLoading(false);
    }
  };

  const setRegeneratingIndex = (index: number | null) => {
    setRegeneratingQuestionIndex(index);
    if (index !== null) {
      setGeneratingQuestionType(fields[index]?.type || null);
    }
  };

  return {
    aiLoading,
    generatingQuestionType,
    setGeneratingQuestionType,
    regeneratingQuestionIndex,
    setRegeneratingQuestionIndex: setRegeneratingIndex,
    handleGenerateQuestion,
    handleRegenerateQuestion,
  };
};
