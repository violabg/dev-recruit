"use client";

import { AIQuizGenerationDialog } from "@/components/quiz/ai-quiz-generation-dialog";
import { QuestionType } from "@/lib/schemas";
import { AIQuestionGenerationDialog } from "./ai-question-generation-dialog";

type AIDialogsProps = {
  // New Question Generation Dialog
  aiDialogOpen: boolean;
  setAiDialogOpen: (open: boolean) => void;
  generatingQuestionType: QuestionType | null;
  onGenerateQuestion: (
    type: QuestionType,
    data: {
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
    }
  ) => Promise<void>;

  // Question Regeneration Dialog
  regenerateDialogOpen: boolean;
  setRegenerateDialogOpen: (open: boolean) => void;
  onRegenerateQuestion: (
    type: QuestionType,
    data: {
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
    }
  ) => Promise<void>;

  fullQuizDialogOpen: boolean;
  setFullQuizDialogOpen: (open: boolean) => void;

  aiLoading: boolean;
  defaultDifficulty?: number;
  languageOptions?: React.ReactNode;
  position: {
    id: string;
    title: string;
    experienceLevel?: string;
    skills: string[];
    description?: string | null;
  };
  quizId?: string;
};

export const AIDialogs = ({
  aiDialogOpen,
  setAiDialogOpen,
  generatingQuestionType,
  onGenerateQuestion,
  regenerateDialogOpen,
  setRegenerateDialogOpen,
  onRegenerateQuestion,
  fullQuizDialogOpen,
  setFullQuizDialogOpen,
  aiLoading,
  defaultDifficulty = 3,
  languageOptions,
  position,
  quizId,
}: AIDialogsProps) => {
  return (
    <>
      {/* Dialogo Generazione Domanda */}
      <AIQuestionGenerationDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        title="Genera Domanda con AI"
        description="Crea una domanda specializzata con opzioni specifiche per un migliore targeting"
        questionType={generatingQuestionType}
        onGenerate={onGenerateQuestion}
        loading={aiLoading}
        defaultDifficulty={defaultDifficulty}
        languageOptions={languageOptions}
      />
      {/* Dialogo Rigenerazione Domanda */}
      <AIQuestionGenerationDialog
        open={regenerateDialogOpen}
        onOpenChange={setRegenerateDialogOpen}
        title="Rigenera Domanda con AI Avanzata"
        description="Sostituisci la domanda esistente con una nuova utilizzando opzioni avanzate"
        questionType={generatingQuestionType}
        onGenerate={onRegenerateQuestion}
        loading={aiLoading}
        defaultDifficulty={defaultDifficulty}
        languageOptions={languageOptions}
      />

      <AIQuizGenerationDialog
        open={fullQuizDialogOpen}
        onOpenChange={setFullQuizDialogOpen}
        title="Genera Nuovo Quiz con AI"
        description="Sostituisci completamente tutte le domande del quiz con nuove generate dall'AI"
        position={position}
        quizId={quizId}
      />
    </>
  );
};
