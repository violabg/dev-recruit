"use client";

import { FlexibleQuestion, QuestionType } from "@/lib/schemas";
import { useMemo, useState } from "react";

export type QuestionTypeFilter = "all" | QuestionType;

type Question = FlexibleQuestion;

type UseQuestionManagementProps = {
  fields: Array<Question & { id: string }>;
};

export const useQuestionManagement = ({
  fields,
}: UseQuestionManagementProps) => {
  const [questionTypeFilter, setQuestionTypeFilter] =
    useState<QuestionTypeFilter>("all");
  // Initialize with all field IDs expanded
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    () => new Set(fields.map((field) => field.id))
  );
  // Track field IDs to detect changes
  const [lastFieldIds, setLastFieldIds] = useState<string[]>(() =>
    fields.map((field) => field.id)
  );

  // Sync expanded questions when fields change (render-time sync)
  const currentFieldIds = fields.map((field) => field.id);
  const fieldsChanged =
    currentFieldIds.length !== lastFieldIds.length ||
    currentFieldIds.some((id, i) => id !== lastFieldIds[i]);

  if (fieldsChanged) {
    setLastFieldIds(currentFieldIds);
    setExpandedQuestions(new Set(currentFieldIds));
  }

  // Memoize filtered questions for better performance
  const filteredQuestions = useMemo(() => {
    return fields.filter((field) => {
      if (questionTypeFilter === "all") return true;
      return field.type === questionTypeFilter;
    });
  }, [fields, questionTypeFilter]);

  const toggleQuestionExpansion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const expandAllQuestions = () => {
    const allQuestionIds = new Set(fields.map((field) => field.id));
    setExpandedQuestions(allQuestionIds);
  };

  const collapseAllQuestions = () => {
    setExpandedQuestions(new Set());
  };

  return {
    questionTypeFilter,
    setQuestionTypeFilter,
    expandedQuestions,
    setExpandedQuestions,
    filteredQuestions,
    toggleQuestionExpansion,
    expandAllQuestions,
    collapseAllQuestions,
  };
};
