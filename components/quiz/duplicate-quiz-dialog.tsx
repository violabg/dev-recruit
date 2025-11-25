"use client";

import { InputField } from "@/components/rhf-inputs/input-field";
import { SelectField } from "@/components/rhf-inputs/select-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { duplicateQuizAction } from "@/lib/actions/quizzes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

type DuplicateQuizDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  quizTitle: string;
  positions: Array<{
    id: string;
    title: string;
  }>;
};

const duplicateFormSchema = z.object({
  newTitle: z.string().min(2, "Il titolo deve contenere almeno 2 caratteri."),
  newPositionId: z.string().min(1, "Seleziona una posizione."),
});

type DuplicateFormData = z.infer<typeof duplicateFormSchema>;

export function DuplicateQuizDialog({
  open,
  onOpenChange,
  quizId,
  quizTitle,
  positions,
}: DuplicateQuizDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<DuplicateFormData>({
    resolver: zodResolver(duplicateFormSchema),
    defaultValues: {
      newTitle: `${quizTitle} - Copia`,
      newPositionId: "",
    },
  });

  const onSubmit = async (data: DuplicateFormData) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("quizId", quizId);
        formData.append("newPositionId", data.newPositionId);
        formData.append("newTitle", data.newTitle);

        const result = await duplicateQuizAction(formData);

        if (result?.id) {
          toast.success("Quiz duplicato con successo!");
          onOpenChange(false);
          form.reset();
          router.push(`/dashboard/quizzes/${result.id}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Errore durante la duplicazione";
        toast.error(errorMessage);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Duplica Quiz</DialogTitle>
          <DialogDescription>
            Crea una copia di questo quiz e assegnala a una nuova posizione.
          </DialogDescription>
        </DialogHeader>

        <FormProvider<DuplicateFormData> {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <InputField<DuplicateFormData>
              control={form.control}
              name="newTitle"
              label="Titolo del Quiz"
              placeholder="Es: Quiz Sviluppatore - Copia"
            />

            <SelectField<DuplicateFormData>
              control={form.control}
              name="newPositionId"
              label="Posizione"
              placeholder="Seleziona una posizione"
              options={positions.map((pos) => ({
                value: pos.id,
                label: pos.title,
              }))}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Annulla
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Duplicazione..." : "Duplica"}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
