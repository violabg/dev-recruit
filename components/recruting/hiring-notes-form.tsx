"use client";

import {
  InputWithTagField,
  SelectField,
  TextareaField,
} from "@/components/rhf-inputs";
import { Button } from "@/components/ui/button";
import { SelectItem } from "@/components/ui/select";
import { updateHiringManagerNotesAction } from "@/lib/actions/evaluation-entity";
import { hiringNotesSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = hiringNotesSchema;

type FormData = z.infer<typeof formSchema>;

type HiringNotesFormProps = {
  evaluationId: string;
  defaultValues?: Partial<FormData>;
};

export const HiringNotesForm = ({
  evaluationId,
  defaultValues,
}: HiringNotesFormProps) => {
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      evaluationId,
      interviewNotes: "",
      redFlags: [],
      standoutMoments: [],
      hireRecommendation: "maybe",
      nextSteps: "",
      ...defaultValues,
    },
  });

  const onSubmit = (values: FormData) => {
    startTransition(async () => {
      try {
        await updateHiringManagerNotesAction(values);
        toast.success("Note del hiring manager salvate");
      } catch (error) {
        toast.error("Errore salvataggio note", {
          description:
            error instanceof Error
              ? error.message
              : "Impossibile salvare le note del hiring manager",
        });
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <TextareaField
        control={form.control}
        name="interviewNotes"
        label="Note del colloquio"
        placeholder="Osservazioni chiave, risposte e segnali emersi..."
        className="min-h-[140px]"
      />

      <InputWithTagField
        control={form.control}
        name="standoutMoments"
        label="Momenti di rilievo"
        placeholder="Premi invio dopo ogni punto"
        description="Esempi concreti di risposte o comportamenti positivi"
      />

      <InputWithTagField
        control={form.control}
        name="redFlags"
        label="Red flags"
        placeholder="Premi invio dopo ogni punto"
        description="Rischi, segnali di allarme o dubbi"
      />

      <SelectField
        control={form.control}
        name="hireRecommendation"
        label="Raccomandazione"
        placeholder="Seleziona una raccomandazione"
      >
        <SelectItem value="strong_yes">Strong Yes</SelectItem>
        <SelectItem value="yes">Yes</SelectItem>
        <SelectItem value="maybe">Maybe</SelectItem>
        <SelectItem value="no">No</SelectItem>
        <SelectItem value="strong_no">Strong No</SelectItem>
      </SelectField>

      <TextareaField
        control={form.control}
        name="nextSteps"
        label="Prossimi step"
        placeholder="Es. colloquio tecnico, prova pratica, offerta..."
        className="min-h-[80px]"
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvataggio..." : "Salva note"}
      </Button>
    </form>
  );
};
