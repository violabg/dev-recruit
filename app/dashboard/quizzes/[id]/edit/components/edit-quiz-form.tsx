"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuestionType, QuizForm } from "@/lib/schemas";
import { useCallback, useState } from "react";
import { FormProvider } from "react-hook-form";
import { useAIGeneration } from "../hooks/use-ai-generation";
import {
  EditQuizFormData,
  SaveQuizResult,
  useEditQuizForm,
} from "../hooks/use-edit-quiz-form";
import { useQuestionManagement } from "../hooks/use-question-management";
import { AIDialogs } from "./ai-dialogs";
import { PresetGenerationButtons } from "./preset-generation-buttons";
import { QuestionsHeader } from "./questions-header";
import { QuestionsList } from "./questions-list";
import { QuizSettings } from "./quiz-settings";

type EditQuizFormProps = {
  quiz: QuizForm;
  position: {
    id: string;
    title: string;
    experience_level: string;
    skills: string[];
  };
  mode?: "edit" | "create";
  onSaveSuccess?: (result?: SaveQuizResult) => void;
};

export function EditQuizForm({
  quiz,
  position,
  mode = "edit",
  onSaveSuccess,
}: EditQuizFormProps) {
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
    handleSaveQuestion,
    hasQuestionChanges,
    sectionSaveStatus,
    addBlankQuestion,
  } = useEditQuizForm({ quiz, position, mode, onSaveSuccess });

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
        requireCodeExample?: boolean;
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

  // Create a wrapper function for question saving with validation
  const handleQuestionSaveWithValidation = useCallback(
    (index: number) => {
      return form.handleSubmit((data: EditQuizFormData) =>
        handleSaveQuestion(index, data)
      )();
    },
    [form, handleSaveQuestion]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modifica Quiz</CardTitle>
          <CardDescription>
            Aggiorna le domande e le impostazioni del quiz per la posizione{" "}
            <strong>{position.title}</strong>
          </CardDescription>
        </CardHeader>
      </Card>

      <FormProvider<EditQuizFormData> {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          {/* Quiz Settings */}
          <QuizSettings
            form={form}
            saveStatus={saveStatus}
            onGenerateFullQuiz={() => setFullQuizDialogOpen(true)}
            aiLoading={aiLoading}
          />

          {/* Smart Question Presets */}
          <PresetGenerationButtons
            onGeneratePreset={handleGeneratePreset}
            loading={aiLoading}
            position={position}
          />

          <Card>
            <CardContent className="space-y-4">
              {/* Questions Management */}
              <QuestionsHeader
                fieldsLength={fields.length}
                questionTypeFilter={questionTypeFilter}
                setQuestionTypeFilter={setQuestionTypeFilter}
                expandAllQuestions={expandAllQuestions}
                collapseAllQuestions={collapseAllQuestions}
                onAddQuestion={addBlankQuestion}
              />
              {/* Questions List */}
              <QuestionsList
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
                onSaveQuestion={handleQuestionSaveWithValidation}
                sectionSaveStatus={sectionSaveStatus}
              />
            </CardContent>
          </Card>
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
        position={position}
      />
    </div>
  );
}
