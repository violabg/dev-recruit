"use client";

import { FlexibleQuestion, QuestionType } from "@/lib/schemas";
import { useEffect, useMemo, useState } from "react";

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
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set()
  );

  // Set all questions as expanded by default
  useEffect(() => {
    const allQuestionIds = new Set(fields.map((field) => field.id));
    setExpandedQuestions(allQuestionIds);
  }, [fields]);

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
