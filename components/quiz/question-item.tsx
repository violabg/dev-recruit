"use client";
import {
  BehavioralScenarioForm,
  CodeSnippetForm,
  MultipleChoiceForm,
  OpenQuestionForm,
} from "@/components/quiz/question-types";
import { InputField } from "@/components/rhf-inputs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  deleteQuestionFromQuizAction,
  toggleQuestionFavoriteAction,
} from "@/lib/actions/questions";
import { CodeSnippetQuestion, questionSchemas } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { getQuestionTypeLabel } from "@/lib/utils/quiz-form-utils";
import { ChevronDown, ChevronUp, Heart, Sparkles, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { EditQuizFormData } from "../../hooks/use-edit-quiz-form";

type Question = z.infer<typeof questionSchemas.flexible>;

type QuestionItemProps = {
  quizId?: string;
  field: Question & { id: string }; // Note: 'id' is from useFieldArray, 'dbId' is the database ID
  actualIndex: number;
  isExpanded: boolean;
  form: UseFormReturn<EditQuizFormData>;
  onToggleExpansion: (questionId: string) => void;
  onRegenerate: (index: number) => void;
  onRemove: (index: number) => void;
  aiLoading: boolean;
  hasQuestionChanges: boolean;
  languageOptions?: React.ReactNode;
};

export const QuestionItem = ({
  quizId,
  field,
  actualIndex,
  isExpanded,
  form,
  onToggleExpansion,
  onRegenerate,
  onRemove,
  aiLoading,
  hasQuestionChanges,
  languageOptions,
}: QuestionItemProps) => {
  // Track local optimistic update state for favorite toggle
  // null means use the field value, boolean means we have a pending/optimistic update
  const [localFavoriteOverride, setLocalFavoriteOverride] = useState<
    boolean | null
  >(null);
  const [isPending, startTransition] = useTransition();

  // Use local override if set, otherwise use field value
  const isFavorite = localFavoriteOverride ?? field.isFavorite ?? false;

  // Check if this question has a database ID (is linked to Question entity)
  // 'dbId' is the Prisma database ID, separate from useFieldArray's 'id'
  const hasDbId = !!field.dbId;

  const handleToggleFavorite = () => {
    if (!hasDbId) {
      toast.error(
        "Salva prima il quiz per poter aggiungere la domanda ai preferiti",
      );
      return;
    }

    startTransition(async () => {
      const result = await toggleQuestionFavoriteAction(field.dbId!);
      if (result?.success) {
        // Set local override for optimistic UI update
        setLocalFavoriteOverride(result.isFavorite ?? !isFavorite);
        toast.success(
          result.isFavorite
            ? "Domanda aggiunta ai preferiti"
            : "Domanda rimossa dai preferiti",
        );
      } else {
        toast.error("Errore nel salvataggio della domanda");
      }
    });
  };

  return (
    <Card
      key={field.id}
      className={cn(
        "relative pt-0 overflow-hidden transition-all duration-200",
        isExpanded ? "shadow-md" : "shadow-sm",
        hasQuestionChanges
          ? "border-amber-500 border shadow-[0_0_15px_rgba(245,158,11,0.15)] dark:shadow-[0_0_20px_rgba(245,158,11,0.1)]"
          : cn(
              "border border-transparent hover:border-primary/50",
              isExpanded && "border-primary/20",
            ),
      )}
    >
      <CardHeader
        className={cn(
          "gap-0 pt-4 [.border-b]:pb-4 transition-colors",
          isExpanded ? "bg-primary/10 border-b" : "bg-muted/10",
        )}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex flex-col">
              <span className="font-medium text-foreground text-md">
                Domanda {actualIndex + 1}
              </span>
              {hasQuestionChanges && (
                <span className="font-medium text-[10px] text-amber-600 dark:text-amber-500 animate-pulse">
                  Modifiche non salvate
                </span>
              )}
            </div>
            <Badge variant="secondary" className="font-normal text-xs">
              {getQuestionTypeLabel(field.type)}
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={handleToggleFavorite}
                    disabled={isPending || !hasDbId}
                  />
                }
              >
                <Heart
                  className={cn(
                    "size-4 transition-colors",
                    isFavorite
                      ? "fill-red-500 text-red-500"
                      : "text-muted-foreground",
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>
                {!hasDbId
                  ? "Salva il quiz per abilitare i preferiti"
                  : isFavorite
                    ? "Rimuovi dai preferiti"
                    : "Aggiungi ai preferiti"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => onRegenerate(actualIndex)}
                    disabled={aiLoading}
                  />
                }
              >
                <Sparkles className="size-4 text-primary" />
              </TooltipTrigger>
              <TooltipContent>Rigenera domanda con AI</TooltipContent>
            </Tooltip>

            {quizId && hasDbId ? (
              <DeleteWithConfirm
                deleteAction={async () => {
                  const result = await deleteQuestionFromQuizAction(
                    quizId,
                    field.dbId!,
                  );
                  if (result?.success) {
                    // Remove from form state after successful deletion
                    onRemove(actualIndex);
                    // Reset form with current values (after removal) to clear dirty state
                    // Use setTimeout to ensure the removal has been processed
                    setTimeout(() => {
                      const currentValues = form.getValues();
                      form.reset(currentValues);
                    }, 0);
                  }
                  return result;
                }}
                title="Elimina domanda"
                description={
                  isFavorite
                    ? "Questa domanda è nei preferiti. Verrà rimossa dal quiz ma rimarrà disponibile nei preferiti."
                    : "Questa azione non può essere annullata. La domanda verrà eliminata permanentemente."
                }
                label="Elimina"
                iconOnly
                variant="ghost"
                successMessage={
                  isFavorite ? "Domanda rimossa dal quiz" : "Domanda eliminata"
                }
              />
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(actualIndex)}
                    />
                  }
                >
                  <Trash2 className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Rimuovi domanda</TooltipContent>
              </Tooltip>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => onToggleExpansion(field.id)}
            >
              {isExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </div>
        {!isExpanded && field.question && (
          <p className="mt-2 pl-1 border-muted border-l-2 text-muted-foreground text-sm line-clamp-2">
            {field.question}
          </p>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          <div className="space-y-6">
            <div className="bg-muted/30 p-4 border border-border/50 rounded-lg">
              <InputField
                control={form.control}
                name={`questions.${actualIndex}.question`}
                label="Testo della domanda"
                placeholder="Inserisci il testo della domanda"
                required
                maxLength={500}
                className="bg-background"
              />
            </div>

            <div className="pl-1">
              {field.type === "multiple_choice" && (
                <MultipleChoiceForm index={actualIndex} />
              )}
              {field.type === "open_question" && (
                <OpenQuestionForm index={actualIndex} />
              )}
              {field.type === "behavioral_scenario" && (
                <BehavioralScenarioForm index={actualIndex} />
              )}
              {field.type === "code_snippet" && (
                <CodeSnippetForm
                  index={actualIndex}
                  field={field as CodeSnippetQuestion}
                  languageOptions={languageOptions}
                />
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
