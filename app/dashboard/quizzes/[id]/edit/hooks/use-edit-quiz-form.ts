"use client";

import { updateQuizAction } from "@/lib/actions/quizzes";
import {
  FlexibleQuestion,
  questionSchemas,
  QuestionType,
  QuizForm,
  saveQuizRequestSchema,
} from "@/lib/schemas";
import { generateId } from "@/lib/utils/quiz-form-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

// Use the consolidated schemas with form-specific validation
const editQuizFormSchema = saveQuizRequestSchema.extend({
  position_id: z.string().optional(), // Make position_id optional for updates
  questions: z
    .array(questionSchemas.flexible)
    .min(1, "Almeno una domanda è obbligatoria"),
});

export type EditQuizFormData = z.infer<typeof editQuizFormSchema>;

type UseEditQuizFormProps = {
  quiz: QuizForm;
  position: {
    id: string;
    title: string;
    experience_level: string;
    skills: string[];
  };
};

export const useEditQuizForm = ({ quiz, position }: UseEditQuizFormProps) => {
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");

  // Track section-specific save status
  const [sectionSaveStatus, setSectionSaveStatus] = useState<{
    settings: "idle" | "saving" | "success" | "error";
    questions: Record<string, "idle" | "saving" | "success" | "error">;
  }>({
    settings: "idle",
    questions: {},
  });

  const form = useForm<EditQuizFormData>({
    resolver: zodResolver(editQuizFormSchema),
    defaultValues: {
      title: quiz.title,
      position_id: position.id,
      time_limit: quiz.time_limit,
      questions: quiz.questions,
    },
  });

  const { fields, append, prepend, remove, update } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const createEmptyQuestion = (type: QuestionType): FlexibleQuestion => {
    const base = {
      id: generateId(),
      type,
      question: "",
      keywords: [],
      explanation: "",
    };

    switch (type) {
      case "multiple_choice":
        return {
          ...base,
          options: [""],
          correctAnswer: 0,
        };
      case "open_question":
        return {
          ...base,
          sampleAnswer: "Sample answer to be provided",
          sampleSolution: "",
          codeSnippet: "",
        };
      case "code_snippet":
        return {
          ...base,
          codeSnippet: "// TODO: add code",
          sampleSolution: "// TODO: add solution",
          language: "javascript",
        };
      default:
        return base;
    }
  };

  const addBlankQuestion = (type: QuestionType) => {
    prepend(createEmptyQuestion(type));
  };

  const save = async (data: EditQuizFormData) => {
    const formData = new FormData();
    formData.append("quiz_id", quiz.id);
    formData.append("title", data.title);
    if (data.time_limit !== null) {
      formData.append("time_limit", data.time_limit.toString());
    }
    formData.append("questions", JSON.stringify(data.questions));

    await updateQuizAction(formData);
  };

  const handleSave = async (data: EditQuizFormData) => {
    setSaveStatus("saving");

    try {
      await save(data);

      setSaveStatus("success");
      toast.success("Quiz salvato con successo");

      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      setSaveStatus("error");
      console.error("Errore salvataggio:", error);

      let errorMessage = "Errore durante il salvataggio del quiz";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error("Errore salvataggio", {
        description: errorMessage,
      });

      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // Check if settings section has changes
  const hasSettingsChanges = () => {
    const currentValues = form.getValues();
    return (
      currentValues.title !== quiz.title ||
      currentValues.time_limit !== quiz.time_limit
    );
  };

  // Check if a specific question has changes
  const hasQuestionChanges = useCallback(
    (index: number) => {
      const currentQuestion = form.getValues(`questions.${index}`);
      const originalQuestion = quiz.questions[index];

      if (!originalQuestion) return true; // New question
      if (!currentQuestion) return false; // Question was removed

      // Deep comparison excluding dynamic fields
      const normalizeQuestion = (q: typeof currentQuestion) => ({
        question: q.question,
        type: q.type,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
        language: q.language || "",
        codeSnippet: q.codeSnippet || "",
        sampleSolution: q.sampleSolution || "",
        sampleAnswer: q.sampleAnswer || "",
        keywords: q.keywords || [],
      });

      const currentNormalized = normalizeQuestion(currentQuestion);
      const originalNormalized = normalizeQuestion(originalQuestion);

      return (
        JSON.stringify(currentNormalized) !== JSON.stringify(originalNormalized)
      );
    },
    [form, quiz.questions]
  );

  // Save a specific question
  const handleSaveQuestion = async (index: number, data: EditQuizFormData) => {
    const questionId = fields[index]?.id || `question-${index}`;
    setSectionSaveStatus((prev) => ({
      ...prev,
      questions: { ...prev.questions, [questionId]: "saving" },
    }));

    try {
      await save(data);

      setSectionSaveStatus((prev) => ({
        ...prev,
        questions: { ...prev.questions, [questionId]: "success" },
      }));
      toast.success("Domanda salvata con successo");

      // Reset status after 2 seconds
      const timeoutId = setTimeout(() => {
        setSectionSaveStatus((prev) => ({
          ...prev,
          questions: { ...prev.questions, [questionId]: "idle" },
        }));
      }, 2000);

      // Store timeout ID for potential cleanup
      return timeoutId;
    } catch (error) {
      setSectionSaveStatus((prev) => ({
        ...prev,
        questions: { ...prev.questions, [questionId]: "error" },
      }));
      console.error("Errore salvataggio domanda:", error);

      let errorMessage = "Errore durante il salvataggio della domanda";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error("Errore salvataggio domanda", {
        description: errorMessage,
      });

      const timeoutId = setTimeout(
        () =>
          setSectionSaveStatus((prev) => ({
            ...prev,
            questions: { ...prev.questions, [questionId]: "idle" },
          })),
        3000
      );

      // Store timeout ID for potential cleanup
      return timeoutId;
    }
  };

  return {
    form,
    fields,
    append,
    prepend,
    remove,
    update,
    handleSave,
    saveStatus,
    generateId,
    addBlankQuestion,
    handleSaveQuestion,
    hasSettingsChanges,
    hasQuestionChanges,
    sectionSaveStatus,
  };
};
