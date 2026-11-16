"use client";

import { upsertQuizAction } from "@/lib/actions/quizzes";
import { QuizForEdit } from "@/lib/data/quizzes";
import {
  FlexibleQuestion,
  quizEditorSchema,
  QuestionType,
  type QuizEditorData,
} from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { generateId } from "@/lib/utils/quiz-form-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

export type EditQuizFormData = QuizEditorData;

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

export type SaveQuizResult = { id: string };

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

  const [isPending, startTransition] = useTransition();

  const pathname = usePathname();

  const initialValues = useMemo(
    () => ({
      title: quiz.title,
      positionId: position.id,
      timeLimit: quiz.timeLimit,
      questions: quiz.questions,
    }),
    [position.id, quiz.questions, quiz.timeLimit, quiz.title],
  );

  const form = useForm<EditQuizFormData>({
    resolver: zodResolver(quizEditorSchema),
    defaultValues: initialValues,
  });

  const { fields, append, prepend, remove, update, replace } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  // Reset form on entry to ensure clean state
  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues, pathname]);

  const createEmptyQuestion = (type: QuestionType): FlexibleQuestion => {
    const base = {
      id: generateId(),
      type,
      question: "",
      keywords: [],
      explanation: "",
      criterionIds: [],
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
          sampleAnswer: "Risposta di esempio da fornire",
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
      case "behavioral_scenario":
        return {
          ...base,
          sampleAnswer: "Risposta di esempio da fornire",
        };
      default:
        return base;
    }
  };

  const addBlankQuestion = (type: QuestionType) => {
    prepend(createEmptyQuestion(type));
  };

  const save = async (data: EditQuizFormData) =>
    unwrap(
      await upsertQuizAction({
        title: data.title,
        timeLimit: data.timeLimit,
        questions: data.questions,
        ...(isCreateMode
          ? { positionId: data.positionId ?? position.id }
          : { quizId: quiz.id }),
      }),
    );

  const handleSave = (data: EditQuizFormData) => {
    setSaveStatus("saving");

    startTransition(async () => {
      try {
        const result = await save(data);

        setSaveStatus("success");
        toast.success("Quiz salvato con successo");

        // Reset form dirty state after successful save
        form.reset(data);

        // Reset status after 2 seconds
        setTimeout(() => setSaveStatus("idle"), 2000);
        if (onSaveSuccess && result) {
          onSaveSuccess(result);
        }
      } catch (error) {
        setSaveStatus("error");

        toast.error("Errore salvataggio", {
          description: errorMessage(
            error,
            "Errore durante il salvataggio del quiz",
          ),
        });

        // Reset status after 3 seconds
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    });
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
        // Order of the selected criteria does not matter
        criterionIds: [...(q.criterionIds ?? [])].sort(),
      });

      const currentNormalized = normalizeQuestion(currentQuestion);
      const originalNormalized = normalizeQuestion(originalQuestion);

      return (
        JSON.stringify(currentNormalized) !== JSON.stringify(originalNormalized)
      );
    },
    [form, quiz.questions],
  );

  // Save a specific question
  const handleSaveQuestion = (index: number, data: EditQuizFormData) => {
    const questionId = fields[index]?.id || `question-${index}`;
    setSectionSaveStatus((prev) => ({
      ...prev,
      questions: { ...prev.questions, [questionId]: "saving" },
    }));

    startTransition(async () => {
      try {
        await save(data);

        setSectionSaveStatus((prev) => ({
          ...prev,
          questions: { ...prev.questions, [questionId]: "success" },
        }));
        toast.success("Domanda salvata con successo");

        // Reset form dirty state after successful save
        form.reset(data);

        // Reset status after 2 seconds
        setTimeout(() => {
          setSectionSaveStatus((prev) => ({
            ...prev,
            questions: { ...prev.questions, [questionId]: "idle" },
          }));
        }, 2000);
      } catch (error) {
        setSectionSaveStatus((prev) => ({
          ...prev,
          questions: { ...prev.questions, [questionId]: "error" },
        }));

        toast.error("Errore salvataggio domanda", {
          description: errorMessage(
            error,
            "Errore durante il salvataggio della domanda",
          ),
        });

        setTimeout(
          () =>
            setSectionSaveStatus((prev) => ({
              ...prev,
              questions: { ...prev.questions, [questionId]: "idle" },
            })),
          3000,
        );
      }
    });
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
          "Hai modifiche non salvate. Sei sicuro di voler abbandonare la pagina?",
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
    replace,
    handleSave,
    saveStatus,
    generateId,
    addBlankQuestion,
    handleSaveQuestion,
    hasSettingsChanges,
    hasQuestionChanges,
    sectionSaveStatus,
    isPending,
    isDirty,
  };
};
