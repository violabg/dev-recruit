"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toggleQuestionFavoriteAction } from "@/lib/actions/questions";
import { errorMessage } from "@/lib/utils/action-result";
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
  const hasDbId = !!question.dbId;

  const handleToggleFavorite = () => {
    if (!hasDbId) {
      toast.error("Questa domanda non può essere aggiunta ai preferiti");
      return;
    }

    startTransition(async () => {
      const result = await toggleQuestionFavoriteAction(question.dbId!);
      if (result.success) {
        setIsFavorite(result.isFavorite);
        toast.success(
          result.isFavorite
            ? "Domanda aggiunta ai preferiti"
            : "Domanda rimossa dai preferiti"
        );
      } else {
        toast.error(errorMessage(result.error));
      }
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
            disabled={isPending || !hasDbId}
            className={isFavorite ? "text-destructive" : ""}
          />
        }
      >
        <Heart
          className={cn(
            "size-4",
            isFavorite && "fill-destructive text-destructive",
          )}
        />
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
