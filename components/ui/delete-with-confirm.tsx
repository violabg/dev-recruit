"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

type DeleteWithConfirmProps = {
  /** The async action to call when the user confirms the deletion */
  deleteAction: () => Promise<void | { success: boolean; error?: string }>;
  /** Optional custom title for the dialog (default: "Sei sicuro?") */
  title?: string;
  /** Optional custom description for the dialog */
  description?: string;
  /** Optional custom label for the delete button (default: "Elimina") */
  label?: string;
  /** Whether to show only the icon without text (default: false) */
  iconOnly?: boolean;
  /** Optional success message shown via toast */
  successMessage?: string;
  /** Optional error message shown via toast */
  errorMessage?: string;
  /** Callback called after successful deletion */
  onSuccess?: () => void;
  /** Button size (default: "sm") */
  size?: "default" | "sm" | "lg" | "icon";
  /** Button variant (default: "destructive") */
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  /** Whether the button is disabled */
  disabled?: boolean;
};

export function DeleteWithConfirm({
  deleteAction,
  title = "Sei sicuro?",
  description = "Questa azione non può essere annullata. I dati verranno eliminati permanentemente.",
  label = "Elimina",
  iconOnly = false,
  successMessage,
  errorMessage = "Errore durante l'eliminazione",
  onSuccess,
  size = "sm",
  variant = "destructive",
  disabled = false,
}: DeleteWithConfirmProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteAction();

        // Handle both void and result object returns
        if (result && typeof result === "object" && "success" in result) {
          if (result.success) {
            if (successMessage) {
              toast.success(successMessage);
            }
            onSuccess?.();
          } else {
            toast.error(result.error || errorMessage);
          }
        } else {
          // Assume success if no error was thrown and no result object
          if (successMessage) {
            toast.success(successMessage);
          }
          onSuccess?.();
        }
      } catch (error) {
        // Ignore redirect errors (Next.js uses Error to redirect)
        if (
          error instanceof Error &&
          error.message?.includes("NEXT_REDIRECT")
        ) {
          return;
        }
        console.error("Error during deletion:", error);
        toast.error(errorMessage);
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={iconOnly ? "icon" : size}
          disabled={disabled || isPending}
        >
          <Trash className={iconOnly ? "w-4 h-4" : "mr-1 w-4 h-4"} />
          {!iconOnly && label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Eliminazione...
              </>
            ) : (
              <>
                <Trash className="mr-1 w-4 h-4" />
                {label}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
