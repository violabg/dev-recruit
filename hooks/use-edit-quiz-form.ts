"use client";

import { upsertQuizAction } from "@/lib/actions/quizzes";
import { QuizForEdit } from "@/lib/data/quizzes";
import {
  FlexibleQuestion,
  questionSchemas,
  QuestionType,
  saveQuizRequestSchema,
} from "@/lib/schemas";
import { generateId } from "@/lib/utils/quiz-form-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

// Use the consolidated schemas with form-specific validation
const editQuizFormSchema = saveQuizRequestSchema.extend({
  positionId: z.string().optional(), // Make positionId optional for updates
  questions: z
    .array(questionSchemas.flexible)
    .min(1, "Almeno una domanda è obbligatoria"),
});

export type EditQuizFormData = z.infer<typeof editQuizFormSchema>;

type UseEditQuizFormProps = {
  quiz: QuizForEdit;
  position: {
    id: string;
    title: string;
    experienceLevel: string;
    skills: string[];
  };
  mode?: "edit" | "create";
  onSaveSuccess?: (result?: SaveQuizResult) => void;
};

export type SaveQuizResult = Awaited<ReturnType<typeof upsertQuizAction>>;

export const useEditQuizForm = ({
  quiz,
  position,
  mode = "edit",
  onSaveSuccess,
}: UseEditQuizFormProps) => {
  const isCreateMode = mode === "create";
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
      positionId: position.id,
      timeLimit: quiz.timeLimit,
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
          options: ["Opzione 1", "Opzione 2", "Opzione 3", "Opzione 4"],
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
    formData.append("title", data.title);
    if (data.timeLimit !== null) {
      formData.append("timeLimit", data.timeLimit.toString());
    }
    formData.append("questions", JSON.stringify(data.questions));

    if (isCreateMode) {
      const positionId = data.positionId ?? position.id;
      if (!positionId) {
        throw new Error("Position ID is required for quiz creation");
      }
      formData.append("positionId", positionId);
    } else {
      formData.append("quizId", quiz.id);
    }

    return await upsertQuizAction(formData);
  };

  const handleSave = async (data: EditQuizFormData) => {
    setSaveStatus("saving");

    try {
      const result = await save(data);

      setSaveStatus("success");
      toast.success("Quiz salvato con successo");

      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (onSaveSuccess && result) {
        onSaveSuccess(result);
      }
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
      currentValues.timeLimit !== quiz.timeLimit
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

  // Track form dirty state for unsaved changes warning
  const isDirty = form.formState.isDirty;

  // Warn user about unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Modern browsers ignore custom messages and show their own
        return "";
      }
    };

    // Handle browser back/forward buttons
    const handlePopState = () => {
      if (isDirty) {
        const confirmed = window.confirm(
          "Hai modifiche non salvate. Sei sicuro di voler abbandonare la pagina?"
        );
        if (!confirmed) {
          // Push current state back to prevent navigation
          window.history.pushState(null, "", window.location.href);
        }
      }
    };

    // Push initial state to enable popstate interception
    if (isDirty) {
      window.history.pushState(null, "", window.location.href);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty]);

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
    isDirty,
  };
};
