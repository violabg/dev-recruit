"use client";
import { Button } from "@/components/ui/button";
import { QuizForEdit } from "@/lib/data/quizzes";
import { FlexibleQuestion, QuestionType } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { getSaveButtonContent } from "@/lib/utils/quiz-form-utils";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { FormProvider } from "react-hook-form";
import { useAIGeneration } from "../../hooks/use-ai-generation";
import {
  type EditQuizFormData,
  SaveQuizResult,
  useEditQuizForm,
} from "../../hooks/use-edit-quiz-form";
import { useQuestionManagement } from "../../hooks/use-question-management";
import { AIDialogs } from "./ai-dialogs";
import { FavoriteQuestionsDialog } from "./favorite-questions-dialog";
import { PresetGenerationButtons } from "./preset-generation-buttons";
import { QuestionsHeader } from "./questions-header";
import { QuestionsList } from "./questions-list";
import { QuizSettings } from "./quiz-settings";

const _: EditQuizFormData = {
  title: "string",
  timeLimit: 0,
  questions: [
    {
      type: "code_snippet" as const,
      question: "string",
    },
  ],
};
// to avoid unused type error

type EditQuizFormProps = {
  quiz: QuizForEdit;
  position: {
    id: string;
    title: string;
    experienceLevel: string;
    skills: string[];
  };
  mode?: "edit" | "create";
  onSaveSuccess?: (result?: SaveQuizResult) => void;
  languageOptions?: React.ReactNode;
};

export function EditQuizForm({
  quiz,
  position,
  mode = "edit",
  onSaveSuccess,
  languageOptions,
}: EditQuizFormProps) {
  const router = useRouter();

  // Form management
  const {
    form,
    fields,
    append,
    prepend,
    remove,
    update,
    handleSave,
    saveStatus,
    addBlankQuestion,
    isDirty,
    hasQuestionChanges,
  } = useEditQuizForm({ quiz, position, mode, onSaveSuccess });

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        "Hai modifiche non salvate. Sei sicuro di voler abbandonare la pagina?"
      );
      if (!confirmed) return;
      // Reset form to prevent popstate handler from blocking navigation
      form.reset();
    }
    if (mode === "edit") {
      router.push(`/dashboard/quizzes/${quiz.id}`);
    } else {
      router.push(`/dashboard/quizzes`);
    }
  };

  // Question management
  const {
    questionTypeFilter,
    setQuestionTypeFilter,
    expandedQuestions,
    setExpandedQuestions,
    filteredQuestions,
    toggleQuestionExpansion,
    expandAllQuestions,
    collapseAllQuestions,
  } = useQuestionManagement({ fields });

  // AI generation state
  const AIGeneration = useAIGeneration({
    form,
    fields,
    position,
    prepend,
    append,
    remove,
    update,
    setExpandedQuestions,
  });

  const {
    aiLoading,
    setRegeneratingQuestionIndex,
    generatingQuestionType,
    handleGenerateQuestion,
    handleRegenerateQuestion,
  } = AIGeneration;

  // AI Generation states
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [fullQuizDialogOpen, setFullQuizDialogOpen] = useState(false);
  const [favoritesDialogOpen, setFavoritesDialogOpen] = useState(false);

  // Handle adding favorite questions
  const handleAddFavoriteQuestions = useCallback(
    (questions: FlexibleQuestion[]) => {
      // useFieldArray will generate its own 'id' for tracking
      // The question's 'dbId' is preserved for database linking
      questions.forEach((q) => {
        prepend(q);
      });
      // Expand newly added questions
      setExpandedQuestions((prev) => {
        const newSet = new Set(prev);
        questions.forEach((_, idx) => {
          const field = fields[idx];
          if (field) {
            newSet.add(field.id);
          }
        });
        return newSet;
      });
    },
    [prepend, fields, setExpandedQuestions]
  );

  // Handle preset generation
  const handleGeneratePreset = async (
    type: QuestionType,
    presetId: string,
    options: Record<string, unknown>
  ) => {
    // Use enhanced generation if available
    const enhancedOptions = {
      llmModel: "llama-3.3-70b-versatile",
      difficulty: 3,
      ...options,
    };
    await handleGenerateQuestion(
      type,
      enhancedOptions as {
        llmModel: string;
        difficulty?: number;
        instructions?: string;
        focusAreas?: string[];
        distractorComplexity?: "simple" | "moderate" | "complex";
        expectedResponseLength?: "short" | "medium" | "long";
        evaluationCriteria?: string[];
        language?: string;
        bugType?: "syntax" | "logic" | "performance" | "security";
        codeComplexity?: "basic" | "intermediate" | "advanced";
        includeComments?: boolean;
      }
    );
  };

  const handleRegenerate = useCallback(
    (index: number) => {
      setRegeneratingQuestionIndex(index);
      setRegenerateDialogOpen(true);
    },
    [setRegeneratingQuestionIndex]
  );

  return (
    <>
      <FormProvider<EditQuizFormData> {...form}>
        <form
          onSubmit={form.handleSubmit(handleSave)}
          className="space-y-6"
          noValidate
        >
          {/* Quiz Settings */}
          <QuizSettings
            form={form}
            onGenerateFullQuiz={() => setFullQuizDialogOpen(true)}
            aiLoading={aiLoading}
          />

          {/* Smart Question Presets */}
          <PresetGenerationButtons
            onGeneratePreset={handleGeneratePreset}
            loading={aiLoading}
          />

          <div className="space-y-6">
            {/* Questions Management */}
            <QuestionsHeader
              fieldsLength={fields.length}
              questionTypeFilter={questionTypeFilter}
              setQuestionTypeFilter={setQuestionTypeFilter}
              expandAllQuestions={expandAllQuestions}
              collapseAllQuestions={collapseAllQuestions}
              onAddQuestion={addBlankQuestion}
              onOpenFavorites={() => setFavoritesDialogOpen(true)}
            />
            {/* Questions List */}
            <QuestionsList
              quizId={mode === "edit" ? quiz.id : undefined}
              filteredQuestions={filteredQuestions}
              fields={fields}
              expandedQuestions={expandedQuestions}
              questionTypeFilter={questionTypeFilter}
              form={form}
              onToggleExpansion={toggleQuestionExpansion}
              onRegenerate={handleRegenerate}
              onRemove={remove}
              aiLoading={aiLoading}
              hasQuestionChanges={hasQuestionChanges}
              languageOptions={languageOptions}
            />
          </div>

          {/* Sticky Save Bar - visible only when form is dirty */}
          {isDirty && (
            <div className="right-0 bottom-0 left-0 z-50 fixed flex justify-center items-center gap-4 bg-background/95 supports-backdrop-filter:bg-background/80 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] backdrop-blur px-6 py-4 border-t">
              <div className="flex items-center gap-3">
                <span className="font-medium text-amber-600 dark:text-amber-500 text-sm animate-pulse">
                  Modifiche non salvate
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={saveStatus === "saving"}
                >
                  <X className="mr-1.5 size-4" />
                  Annulla
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saveStatus === "saving"}
                  className={cn(
                    "transition-all",
                    saveStatus === "success"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : saveStatus === "error"
                      ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                  )}
                >
                  {getSaveButtonContent(saveStatus)}
                </Button>
              </div>
            </div>
          )}
        </form>
      </FormProvider>

      {/* AI Generation Dialogs */}
      <AIDialogs
        aiDialogOpen={aiDialogOpen}
        setAiDialogOpen={setAiDialogOpen}
        generatingQuestionType={generatingQuestionType}
        onGenerateQuestion={handleGenerateQuestion}
        regenerateDialogOpen={regenerateDialogOpen}
        setRegenerateDialogOpen={setRegenerateDialogOpen}
        onRegenerateQuestion={handleRegenerateQuestion}
        fullQuizDialogOpen={fullQuizDialogOpen}
        setFullQuizDialogOpen={setFullQuizDialogOpen}
        aiLoading={aiLoading}
        languageOptions={languageOptions}
        position={position}
        quizId={mode === "edit" ? quiz.id : undefined}
      />

      {/* Favorite Questions Dialog */}
      <FavoriteQuestionsDialog
        open={favoritesDialogOpen}
        onOpenChange={setFavoritesDialogOpen}
        onAddQuestions={handleAddFavoriteQuestions}
      />
    </>
  );
}
