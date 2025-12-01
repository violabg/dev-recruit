"use client";
import {
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
import { getQuestionTypeLabel, SaveStatus } from "@/lib/utils/quiz-form-utils";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";
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
  // Section-specific save props
  hasQuestionChanges: boolean;
  onSaveQuestion: () => void;
  questionSaveStatus: SaveStatus;
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
  onSaveQuestion,
  questionSaveStatus,
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
        "Salva prima il quiz per poter aggiungere la domanda ai preferiti"
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
            : "Domanda rimossa dai preferiti"
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
        hasQuestionChanges
          ? "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] dark:shadow-[0_0_20px_rgba(245,158,11,0.1)]"
          : "hover:border-primary/50 border-muted",
        isExpanded
          ? "ring-1 ring-primary/10 shadow-md border-primary/20"
          : "shadow-sm"
      )}
    >
      <CardHeader
        className={cn(
          "gap-0 pt-4 [.border-b]:pb-4 transition-colors",
          isExpanded ? "bg-primary/10 border-b" : "bg-muted/10"
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
            {/* Save button in header - visible when changes exist */}
            {(hasQuestionChanges || questionSaveStatus !== "idle") && (
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveQuestion();
                }}
                disabled={questionSaveStatus === "saving"}
                size="sm"
                className={cn(
                  "mr-2 px-3 h-8 transition-all",
                  questionSaveStatus === "success"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : questionSaveStatus === "error"
                    ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                )}
              >
                <Save className="mr-1.5 w-3.5 h-3.5" />
                {questionSaveStatus === "saving"
                  ? "Salvataggio..."
                  : questionSaveStatus === "success"
                  ? "Salvato"
                  : questionSaveStatus === "error"
                  ? "Errore"
                  : "Salva"}
              </Button>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  onClick={handleToggleFavorite}
                  disabled={isPending || !hasDbId}
                >
                  <Heart
                    className={cn(
                      "size-4 transition-colors",
                      isFavorite
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground"
                    )}
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => onRegenerate(actualIndex)}
                  disabled={aiLoading}
                >
                  <Sparkles className="size-4 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rigenera domanda con AI</TooltipContent>
            </Tooltip>

            {quizId && hasDbId ? (
              <DeleteWithConfirm
                deleteAction={async () => {
                  const result = await deleteQuestionFromQuizAction(
                    quizId,
                    field.dbId!
                  );
                  if (result?.success) {
                    // Remove from form state after successful deletion
                    onRemove(actualIndex);
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
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(actualIndex)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
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
              {field.type === "code_snippet" && (
                <CodeSnippetForm
                  index={actualIndex}
                  field={field as CodeSnippetQuestion}
                />
              )}
            </div>
          </div>

          {(hasQuestionChanges || questionSaveStatus !== "idle") && (
            <div className="bottom-0 z-10 sticky flex justify-end bg-background shadow-sm -mx-6 mt-6 -mb-6 p-4 border-t rounded-b-xl">
              <Button
                type="button"
                onClick={onSaveQuestion}
                disabled={questionSaveStatus === "saving"}
                size="sm"
                className={cn(
                  "shadow-sm",
                  questionSaveStatus === "success"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : questionSaveStatus === "error"
                    ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                )}
              >
                <Save className="mr-2 size-4" />
                {questionSaveStatus === "saving"
                  ? "Salvataggio in corso..."
                  : questionSaveStatus === "success"
                  ? "Modifiche salvate"
                  : questionSaveStatus === "error"
                  ? "Errore salvataggio"
                  : "Salva modifiche"}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
