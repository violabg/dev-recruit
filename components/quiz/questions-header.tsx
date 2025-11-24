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
import { QuestionTypeFilter } from "@/hooks/use-question-management";
import { QuestionType } from "@/lib/schemas";
import {
  getQuestionTypeLabel,
  questionTypes,
} from "@/lib/utils/quiz-form-utils";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";

type QuestionsHeaderProps = {
  fieldsLength: number;
  questionTypeFilter: QuestionTypeFilter;
  setQuestionTypeFilter: (filter: QuestionTypeFilter) => void;
  expandAllQuestions: () => void;
  collapseAllQuestions: () => void;
  onAddQuestion: (type: QuestionType) => void;
};

export const QuestionsHeader = ({
  fieldsLength,
  questionTypeFilter,
  setQuestionTypeFilter,
  expandAllQuestions,
  collapseAllQuestions,
  onAddQuestion,
}: QuestionsHeaderProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <CardTitle>Domande ({fieldsLength})</CardTitle>
            <CardDescription>
              Gestisci e genera domande del quiz utilizzando l'AI
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select
              value={questionTypeFilter}
              onValueChange={setQuestionTypeFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtra per tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
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
            <ChevronDown className="mr-1 w-4 h-4" />
            Espandi tutto
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={collapseAllQuestions}
          >
            <ChevronUp className="mr-1 w-4 h-4" />
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
                <Plus className="mr-1 w-4 h-4 text-primary" />
                {getQuestionTypeLabel(type.value as QuestionType)}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
