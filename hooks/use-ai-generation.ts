/**
 *  AI Generation Hook (Example)
 *
 * This is an example of how to use the new modular question prompt system
 * with type-specific parameters for better question generation.
 */

"use client";

import { generateNewQuestionAction } from "@/lib/actions/quizzes";
import { FlexibleQuestion, QuestionType } from "@/lib/schemas";
import { GenerateQuestionParams } from "@/lib/services/ai-service";
import {
  createBackendQuestionParams,
  createCodeSnippetParams,
  createFrontendQuestionParams,
  createMultipleChoiceParams,
  createOpenQuestionParams,
} from "@/lib/utils/question-prompt-helpers";
import { generateId } from "ai";
import { useEffect, useState } from "react";
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
    value: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => void;
};

type GenerationOptions = {
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

  // Create base configuration from position and form data
  const createBaseConfig = () => ({
    quizTitle: form.getValues("title"),
    positionTitle: position.title,
    experienceLevel: position.experienceLevel,
    skills: position.skills,
    previousQuestions: fields.map((field) => ({
      question: field.question,
      type: field.type,
    })),
  });

  /**
   *  question generation with type-specific parameters
   */
  const handleGenerateQuestion = async (
    type: QuestionType,
    options: GenerationOptions
  ) => {
    setAiLoading(true);
    setGeneratingQuestionType(type);

    try {
      const baseConfig = createBaseConfig();
      let params;

      // Create type-specific parameters based on question type
      switch (type) {
        case "multiple_choice":
          params = createMultipleChoiceParams(baseConfig, {
            focusAreas: options.focusAreas,
            distractorComplexity: options.distractorComplexity || "moderate",
          });
          break;
        case "open_question":
          params = createOpenQuestionParams(baseConfig, {
            expectedResponseLength: options.expectedResponseLength || "medium",
            evaluationCriteria: options.evaluationCriteria,
          });
          break;
        case "code_snippet":
          params = createCodeSnippetParams(baseConfig, {
            language: options.language || inferLanguageFromSkills(),
            bugType: options.bugType,
            codeComplexity: options.codeComplexity || "intermediate",
            includeComments: options.includeComments ?? true,
          });
          break;
      }

      // Add common options
      if (options.difficulty) {
        params.difficulty = options.difficulty;
      }
      if (options.instructions) {
        params.instructions = options.instructions;
      }
      if (options.llmModel) {
        params.specificModel = options.llmModel;
      }

      const newQuestion = await generateNewQuestionAction(params);
      const newQuestionWithId = {
        ...newQuestion,
        id: generateId(),
      };

      prepend(newQuestionWithId);

      // Expand the new question by default
      setExpandedQuestions((prev) => new Set([...prev, newQuestionWithId.id]));

      toast.success(" question generated successfully!");
      setGeneratingQuestionType(null);
    } catch (error) {
      console.error(" question generation error:", error);

      let errorMessage = "Error during  question generation";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error("Generation Error", {
        description: errorMessage,
      });
    } finally {
      setAiLoading(false);
    }
  };

  /**
   * Generate frontend-optimized questions with smart defaults
   */
  const generateFrontendQuestion = async (
    type: QuestionType,
    options: Omit<GenerationOptions, "language" | "bugType" | "codeComplexity">
  ) => {
    const baseConfig = createBaseConfig();
    const params = createFrontendQuestionParams(type, baseConfig);

    // Override with user options
    if (options.difficulty) params.difficulty = options.difficulty;
    if (options.instructions) params.instructions = options.instructions;
    if (options.llmModel) params.specificModel = options.llmModel;

    await generateQuestionWithParams(params);
  };

  /**
   * Generate backend-optimized questions with smart defaults
   */
  const generateBackendQuestion = async (
    type: QuestionType,
    options: Omit<GenerationOptions, "focusAreas" | "distractorComplexity">
  ) => {
    const baseConfig = createBaseConfig();
    const params = createBackendQuestionParams(type, baseConfig);

    // Override with user options
    if (options.difficulty) params.difficulty = options.difficulty;
    if (options.instructions) params.instructions = options.instructions;
    if (options.llmModel) params.specificModel = options.llmModel;

    await generateQuestionWithParams(params);
  };

  /**
   * Low-level function to generate question with specific parameters
   */
  const generateQuestionWithParams = async (params: GenerateQuestionParams) => {
    setAiLoading(true);

    try {
      const newQuestion = await generateNewQuestionAction(params);
      const newQuestionWithId = {
        ...newQuestion,
        id: generateId(),
      };

      prepend(newQuestionWithId);
      setExpandedQuestions((prev) => new Set([...prev, newQuestionWithId.id]));

      toast.success("Question generated successfully!");
    } catch (error) {
      console.error("Question generation error:", error);

      let errorMessage = "Error during question generation";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error("Generation Error", {
        description: errorMessage,
      });
    } finally {
      setAiLoading(false);
    }
  };

  /**
   *  regenerate existing question with type-specific parameters
   */
  const handleRegenerateQuestion = async (
    type: QuestionType,
    options: GenerationOptions
  ) => {
    if (regeneratingQuestionIndex === null) return;

    setAiLoading(true);

    try {
      const currentQuestion = fields[regeneratingQuestionIndex];
      const baseConfig = createBaseConfig();

      let params;

      // Create type-specific parameters based on question type
      switch (type) {
        case "multiple_choice":
          params = createMultipleChoiceParams(baseConfig, {
            focusAreas: options.focusAreas,
            distractorComplexity: options.distractorComplexity || "moderate",
          });
          break;
        case "open_question":
          params = createOpenQuestionParams(baseConfig, {
            expectedResponseLength: options.expectedResponseLength || "medium",
            evaluationCriteria: options.evaluationCriteria,
          });
          break;
        case "code_snippet":
          params = createCodeSnippetParams(baseConfig, {
            language: options.language || inferLanguageFromSkills(),
            bugType: options.bugType,
            codeComplexity: options.codeComplexity || "intermediate",
            includeComments: options.includeComments ?? true,
          });
          break;
      }

      // Add common options
      if (options.difficulty) {
        params.difficulty = options.difficulty;
      }
      if (options.instructions) {
        params.instructions = options.instructions;
      }
      if (options.llmModel) {
        params.specificModel = options.llmModel;
      }

      const newQuestion = await generateNewQuestionAction(params);

      // Update the question at the specific index
      // Keep the same dbId to maintain the database link
      update(regeneratingQuestionIndex, {
        ...newQuestion,
        dbId: currentQuestion.dbId,
      });

      toast.success("Domanda rigenerata con successo!");
      setRegeneratingQuestionIndex(null);
    } catch (error) {
      console.error(" question regeneration error:", error);

      let errorMessage = "Errore durante la rigenerazione della domanda";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error("Errore di Rigenerazione", {
        description: errorMessage,
      });
    } finally {
      setAiLoading(false);
    }
  };

  /**
   * Infer programming language from position skills
   */
  const inferLanguageFromSkills = (): string => {
    const skills = position.skills.map((skill) => skill.toLowerCase());

    if (
      skills.some(
        (skill) =>
          skill.includes("javascript") ||
          skill.includes("react") ||
          skill.includes("node")
      )
    ) {
      return "javascript";
    }
    if (skills.some((skill) => skill.includes("typescript"))) {
      return "typescript";
    }
    if (skills.some((skill) => skill.includes("python"))) {
      return "python";
    }
    if (skills.some((skill) => skill.includes("java"))) {
      return "java";
    }
    if (
      skills.some((skill) => skill.includes("c#") || skill.includes("csharp"))
    ) {
      return "csharp";
    }
    if (skills.some((skill) => skill.includes("php"))) {
      return "php";
    }

    return "javascript"; // Default fallback
  };

  const generateNewQuestion = (type: QuestionType) => {
    setGeneratingQuestionType(type);
  };

  const setRegeneratingIndex = (index: number | null) => {
    setRegeneratingQuestionIndex(index);
  };

  useEffect(() => {
    if (regeneratingQuestionIndex === null) return;
    const questioType = fields[regeneratingQuestionIndex]?.type || null;
    setGeneratingQuestionType(questioType);
  }, [regeneratingQuestionIndex, fields]);

  return {
    aiLoading,
    generatingQuestionType,
    setGeneratingQuestionType,
    regeneratingQuestionIndex,
    setRegeneratingQuestionIndex: setRegeneratingIndex,
    generateNewQuestion,

    //  methods
    handleGenerateQuestion,
    handleRegenerateQuestion,
    generateFrontendQuestion,
    generateBackendQuestion,
    generateQuestionWithParams,
  };
};

/**
 * Usage Examples:
 *
 * ```tsx
 * const {
 *   handleGenerateQuestion,
 *   generateFrontendQuestion,
 *   generateBackendQuestion
 * } = useAIGeneration({ ... });
 *
 * // Generate a complex multiple choice question
 * await handleGenerateQuestion("multiple_choice", {
 *   llmModel: "llama-3.3-70b-versatile",
 *   difficulty: 4,
 *   focusAreas: ["React Hooks", "State Management"],
 *   distractorComplexity: "complex",
 *   instructions: "Focus on advanced React patterns"
 * });
 *
 * // Generate a frontend-optimized open question
 * await generateFrontendQuestion("open_question", {
 *   llmModel: "llama-3.3-70b-versatile",
 *   difficulty: 3,
 *   expectedResponseLength: "medium",
 *   evaluationCriteria: ["conceptual understanding", "best practices"]
 * });
 *
 * // Generate a backend code snippet question
 * await generateBackendQuestion("code_snippet", {
 *   llmModel: "llama-3.3-70b-versatile",
 *   difficulty: 4,
 *   language: "javascript",
 *   bugType: "security",
 *   includeComments: true
 * });
 * ```
 */
