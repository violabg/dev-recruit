"use client";

import { questionSchemas } from "@/lib/schemas";
import { SaveStatus } from "@/lib/utils/quiz-form-utils";
import { useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod/v4";
import { EditQuizFormData } from "../hooks/use-edit-quiz-form";
import { QuestionTypeFilter } from "../hooks/use-question-management";
import { QuestionItem } from "./question-item";

type Question = z.infer<typeof questionSchemas.flexible>;

type QuestionsListProps = {
  filteredQuestions: Array<Question & { id: string }>;
  fields: Array<Question & { id: string }>;
  expandedQuestions: Set<string>;
  questionTypeFilter: QuestionTypeFilter;
  form: UseFormReturn<EditQuizFormData>;
  onToggleExpansion: (questionId: string) => void;
  onRegenerate: (index: number) => void;
  onRemove: (index: number) => void;
  aiLoading: boolean;
  // Section-specific save props
  hasQuestionChanges: (index: number) => boolean;
  onSaveQuestion: (index: number) => void;
  sectionSaveStatus: {
    settings: SaveStatus;
    questions: Record<string, SaveStatus>;
  };
};

export const QuestionsList = ({
  filteredQuestions,
  fields,
  expandedQuestions,
  questionTypeFilter,
  form,
  onToggleExpansion,
  onRegenerate,
  onRemove,
  aiLoading,
  hasQuestionChanges,
  onSaveQuestion,
  sectionSaveStatus,
}: QuestionsListProps) => {
  // Create stable callback for saving questions
  const handleSaveQuestion = useCallback(
    (index: number) => () => onSaveQuestion(index),
    [onSaveQuestion]
  );

  if (filteredQuestions.length === 0) {
    return (
      <div className="py-8 text-muted-foreground text-center">
        {questionTypeFilter === "all"
          ? "Nessuna domanda presente. Aggiungi la prima domanda usando i pulsanti sopra."
          : `Nessuna domanda di tipo "${questionTypeFilter}" trovata.`}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredQuestions.map((field) => {
        const actualIndex = fields.findIndex((f) => f.id === field.id);
        const isExpanded = expandedQuestions.has(field.id);

        return (
          <QuestionItem
            key={field.id}
            field={field}
            actualIndex={actualIndex}
            isExpanded={isExpanded}
            form={form}
            onToggleExpansion={onToggleExpansion}
            onRegenerate={onRegenerate}
            onRemove={onRemove}
            aiLoading={aiLoading}
            hasQuestionChanges={hasQuestionChanges(actualIndex)}
            onSaveQuestion={handleSaveQuestion(actualIndex)}
            questionSaveStatus={sectionSaveStatus.questions[field.id] || "idle"}
          />
        );
      })}
    </div>
  );
};
