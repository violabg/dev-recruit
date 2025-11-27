"use client";
import {
  CodeSnippetForm,
  MultipleChoiceForm,
  OpenQuestionForm,
} from "@/components/quiz/question-types";
import { InputField } from "@/components/rhf-inputs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toggleQuestionFavoriteAction } from "@/lib/actions/questions";
import { CodeSnippetQuestion, questionSchemas } from "@/lib/schemas";
import {
  getQuestionTypeLabel,
  getSaveButtonContent,
  getSaveButtonVariant,
  SaveStatus,
} from "@/lib/utils/quiz-form-utils";
import { ChevronDown, ChevronUp, Heart, Sparkles, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";
import { EditQuizFormData } from "../../hooks/use-edit-quiz-form";

type Question = z.infer<typeof questionSchemas.flexible>;

type QuestionItemProps = {
  field: Question & { id: string };
  actualIndex: number;
  isExpanded: boolean;
  form: UseFormReturn<EditQuizFormData>;
  onToggleExpansion: (questionId: string) => void;
  onRegenerate: (index: number) => void;
  onRemove: (index: number) => void;
  aiLoading: boolean;
  // Section-specific save props
  hasQuestionChanges: boolean;
  onSaveQuestion: () => void;
  questionSaveStatus: SaveStatus;
};

export const QuestionItem = ({
  field,
  actualIndex,
  isExpanded,
  form,
  onToggleExpansion,
  onRegenerate,
  onRemove,
  aiLoading,
  hasQuestionChanges,
  onSaveQuestion,
  questionSaveStatus,
}: QuestionItemProps) => {
  const [isFavorite, setIsFavorite] = useState(field.isFavorite ?? false);
  const [isPending, startTransition] = useTransition();

  // Check if this question has a database ID (is linked to Question entity)
  const hasDbId = !!field.questionId;

  const handleToggleFavorite = () => {
    if (!hasDbId) {
      toast.error(
        "Salva prima il quiz per poter aggiungere la domanda ai preferiti"
      );
      return;
    }

    startTransition(async () => {
      const result = await toggleQuestionFavoriteAction(field.questionId!);
      if (result?.success) {
        setIsFavorite(result.isFavorite ?? !isFavorite);
        toast.success(
          result.isFavorite
            ? "Domanda aggiunta ai preferiti"
            : "Domanda rimossa dai preferiti"
        );
      } else {
        toast.error("Errore nel salvataggio della domanda");
      }
    });
  };

  return (
    <Card key={field.id} className="relative">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-muted-foreground text-sm">
              Domanda {actualIndex + 1}
            </span>
            <span className="inline-flex items-center bg-muted px-2.5 py-0.5 rounded-full font-medium text-xs">
              {getQuestionTypeLabel(field.type)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleFavorite}
                  disabled={isPending || !hasDbId}
                  className={isFavorite ? "text-red-500" : ""}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isFavorite ? "fill-red-500 text-red-500" : ""
                    }`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!hasDbId
                  ? "Salva il quiz per abilitare i preferiti"
                  : isFavorite
                  ? "Rimuovi dai preferiti"
                  : "Aggiungi ai preferiti"}
              </TooltipContent>
            </Tooltip>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRegenerate(actualIndex)}
              disabled={aiLoading}
              title="Rigenera domanda con AI"
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(actualIndex)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onToggleExpansion(field.id)}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        {!isExpanded && field.question && (
          <p className="text-muted-foreground text-sm line-clamp-2">
            {field.question}
          </p>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            <InputField
              control={form.control}
              name={`questions.${actualIndex}.question`}
              label="Testo della domanda"
              placeholder="Inserisci il testo della domanda"
              maxLength={500}
            />

            {field.type === "multiple_choice" && (
              <MultipleChoiceForm index={actualIndex} />
            )}
            {field.type === "open_question" && (
              <OpenQuestionForm index={actualIndex} />
            )}
            {field.type === "code_snippet" && (
              <CodeSnippetForm
                index={actualIndex}
                field={field as CodeSnippetQuestion}
              />
            )}
          </div>

          {(hasQuestionChanges || questionSaveStatus !== "idle") && (
            <CardFooter className="px-0 pt-4">
              <Button
                type="button"
                onClick={onSaveQuestion}
                disabled={questionSaveStatus === "saving"}
                size="sm"
                variant={getSaveButtonVariant(questionSaveStatus)}
              >
                {getSaveButtonContent(questionSaveStatus)}
              </Button>
            </CardFooter>
          )}
        </CardContent>
      )}
    </Card>
  );
};
