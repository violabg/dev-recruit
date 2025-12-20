"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchFavoriteQuestionsAction } from "@/lib/actions/questions";
import type { QuestionWithMetadata } from "@/lib/data/questions";
import { FlexibleQuestion, QuestionType } from "@/lib/schemas";
import {
  getQuestionTypeLabel,
  questionTypes,
} from "@/lib/utils/quiz-form-utils";
import { Heart, Loader2, Search } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

type FavoriteQuestionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddQuestions: (questions: FlexibleQuestion[]) => void;
};

// Convert database entity to FlexibleQuestion format for the form
const convertToFlexibleQuestion = (
  question: QuestionWithMetadata
): FlexibleQuestion => {
  return {
    dbId: question.id, // Database ID for linking
    type: question.type as QuestionType,
    question: question.question,
    keywords: question.keywords,
    explanation: question.explanation ?? undefined,
    options: question.options.length > 0 ? question.options : undefined,
    correctAnswer: question.correctAnswer ?? undefined,
    sampleAnswer: question.sampleAnswer ?? undefined,
    codeSnippet: question.codeSnippet ?? undefined,
    sampleSolution: question.sampleSolution ?? undefined,
    language: question.language ?? undefined,
    isFavorite: true, // Mark as favorite since it comes from favorites
  };
};

export function FavoriteQuestionsDialog({
  open,
  onOpenChange,
  onAddQuestions,
}: FavoriteQuestionsDialogProps) {
  const [questions, setQuestions] = useState<QuestionWithMetadata[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>("all");
  const [isPending, startTransition] = useTransition();

  // Load favorite questions when dialog opens
  useEffect(() => {
    if (open) {
      startTransition(async () => {
        const result = await fetchFavoriteQuestionsAction(1, 100);
        if (result?.success) {
          setQuestions(result.questions as QuestionWithMetadata[]);
        }
        setSelectedIds(new Set());
      });
    }
  }, [open]);

  // Filter questions based on search and type
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      searchQuery === "" ||
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.keywords.some((k) =>
        k.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesType = typeFilter === "all" || q.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const toggleQuestion = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  const handleAddQuestions = () => {
    const selectedQuestions = questions.filter((q) => selectedIds.has(q.id));
    const flexibleQuestions = selectedQuestions.map((q) =>
      convertToFlexibleQuestion(q)
    );
    onAddQuestions(flexibleQuestions);
    onOpenChange(false);
    setSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="fill-red-500 w-5 h-5 text-red-500" />
            Domande Preferite
          </DialogTitle>
          <DialogDescription>
            Seleziona le domande preferite da aggiungere al quiz
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-2 py-2">
          <div className="relative flex-1">
            <Search className="top-1/2 left-3 absolute size-4 text-muted-foreground -translate-y-1/2 transform" />
            <Input
              placeholder="Cerca domande..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            items={questionTypes}
            value={typeFilter}
            onValueChange={setTypeFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {questionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Questions List */}
        <div className="flex-1 space-y-2 pr-2 min-h-0 overflow-y-auto">
          {isPending ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-8 text-muted-foreground text-center">
              {questions.length === 0
                ? "Nessuna domanda preferita. Salva le domande come preferite usando il pulsante cuore."
                : "Nessuna domanda corrisponde ai filtri."}
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center gap-2 py-2 border-b">
                <Checkbox
                  id="select-all"
                  checked={
                    selectedIds.size === filteredQuestions.length &&
                    filteredQuestions.length > 0
                  }
                  onCheckedChange={toggleAll}
                />
                <label
                  htmlFor="select-all"
                  className="font-medium text-sm cursor-pointer"
                >
                  Seleziona tutto ({filteredQuestions.length})
                </label>
              </div>

              {/* Questions */}
              {filteredQuestions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-start gap-3 hover:bg-muted/50 p-3 border rounded-lg transition-colors cursor-pointer"
                  onClick={() => toggleQuestion(question.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(question.id)}
                    onCheckedChange={() => toggleQuestion(question.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center bg-muted px-2 py-0.5 rounded-full font-medium text-xs">
                        {getQuestionTypeLabel(question.type)}
                      </span>
                      {question.keywords.length > 0 && (
                        <span className="text-muted-foreground text-xs">
                          {question.keywords.slice(0, 3).join(", ")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm line-clamp-2">{question.question}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={handleAddQuestions}
            disabled={selectedIds.size === 0}
          >
            Aggiungi {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
