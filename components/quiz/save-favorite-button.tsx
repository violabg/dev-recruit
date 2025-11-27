"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toggleQuestionFavoriteAction } from "@/lib/actions/questions";
import { FlexibleQuestion } from "@/lib/schemas";
import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type SaveFavoriteButtonProps = {
  question: FlexibleQuestion;
};

export function SaveFavoriteButton({ question }: SaveFavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(question.isFavorite ?? false);
  const [isPending, startTransition] = useTransition();

  // Check if this question has a database ID (is linked to Question entity)
  const hasDbId = !!question.questionId;

  const handleToggleFavorite = () => {
    if (!hasDbId) {
      toast.error("Questa domanda non può essere aggiunta ai preferiti");
      return;
    }

    startTransition(async () => {
      const result = await toggleQuestionFavoriteAction(question.questionId!);
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
          ? "Domanda non salvata"
          : isFavorite
          ? "Rimuovi dai preferiti"
          : "Aggiungi ai preferiti"}
      </TooltipContent>
    </Tooltip>
  );
}
