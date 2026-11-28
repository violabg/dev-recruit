"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputField } from "@/components/ui/rhf-inputs/input-field";
import { SelectField } from "@/components/ui/rhf-inputs/select-field";
import { duplicateQuizAction } from "@/lib/actions/quizzes";
import {
  duplicateQuizFormSchema,
  type DuplicateQuizFormData,
} from "@/lib/schemas";
import { unwrap, errorMessage } from "@/lib/utils/action-result";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

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

type DuplicateFormData = DuplicateQuizFormData;

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
    resolver: zodResolver(duplicateQuizFormSchema),
    defaultValues: {
      newTitle: `${quizTitle} - Copia`,
      newPositionId: "",
    },
  });

  const onSubmit = async (data: DuplicateFormData) => {
    startTransition(async () => {
      try {
        const { id } = unwrap(await duplicateQuizAction({ quizId, ...data }));

        toast.success("Test duplicato con successo!");
        onOpenChange(false);
        form.reset();
        router.push(`/dashboard/quizzes/${id}`);
      } catch (error) {
        toast.error(errorMessage(error, "Errore durante la duplicazione"));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Duplica test</DialogTitle>
          <DialogDescription>
            Crea una copia di questo test e assegnala a una nuova posizione.
          </DialogDescription>
        </DialogHeader>

        <FormProvider<DuplicateFormData> {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <InputField<DuplicateFormData>
              control={form.control}
              name="newTitle"
              label="Titolo del test"
              required
              placeholder="Es: Test Sviluppatore - Copia"
            />

            <SelectField<DuplicateFormData>
              control={form.control}
              name="newPositionId"
              label="Posizione"
              required
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
