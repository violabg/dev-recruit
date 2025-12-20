"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QuestionTypeFilter } from "@/hooks/use-question-management";
import { QuestionType } from "@/lib/schemas";
import {
  getQuestionTypeLabel,
  questionTypes,
} from "@/lib/utils/quiz-form-utils";
import { ChevronDown, ChevronUp, Heart, Plus } from "lucide-react";

type QuestionsHeaderProps = {
  fieldsLength: number;
  questionTypeFilter: QuestionTypeFilter;
  setQuestionTypeFilter: (filter: QuestionTypeFilter) => void;
  expandAllQuestions: () => void;
  collapseAllQuestions: () => void;
  onAddQuestion: (type: QuestionType) => void;
  onOpenFavorites?: () => void;
};

export const QuestionsHeader = ({
  fieldsLength,
  questionTypeFilter,
  setQuestionTypeFilter,
  expandAllQuestions,
  collapseAllQuestions,
  onAddQuestion,
  onOpenFavorites,
}: QuestionsHeaderProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <CardTitle>Domande ({fieldsLength})</CardTitle>
            <CardDescription>
              Gestisci e genera domande del quiz utilizzando l&apos;AI
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select
              items={questionTypes}
              value={questionTypeFilter}
              onValueChange={(value) => {
                if (value !== null) {
                  setQuestionTypeFilter(value);
                }
              }}
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={expandAllQuestions}
          >
            <ChevronDown className="mr-1 size-4" />
            Espandi tutto
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={collapseAllQuestions}
          >
            <ChevronUp className="mr-1 size-4" />
            Comprimi tutto
          </Button>

          <div className="flex gap-2 ml-auto">
            {questionTypes.map((type) => (
              <Button
                key={type.value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddQuestion(type.value as QuestionType)}
                className="gap-2"
              >
                <Plus className="mr-1 size-4 text-primary" />
                {getQuestionTypeLabel(type.value as QuestionType)}
              </Button>
            ))}
            {onOpenFavorites && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenFavorites}
                      className="gap-2"
                    />
                  }
                >
                  <Heart className="size-4 text-red-500" />
                  Preferite
                </TooltipTrigger>
                <TooltipContent>Aggiungi domande dai preferiti</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
