"use client";

import { Button } from "@/components/ui/button";
import {
  InputWithTagField,
  SelectField,
  TextareaField,
} from "@/components/ui/rhf-inputs";
import { SelectItem } from "@/components/ui/select";
import { updateHiringManagerNotesAction } from "@/lib/actions/evaluation-entity";
import { hiringNotesSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage, unwrap } from "@/lib/utils/action-result";

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
        unwrap(await updateHiringManagerNotesAction(values));
        toast.success("Note del hiring manager salvate");
      } catch (error) {
        toast.error("Errore salvataggio note", {
          description: errorMessage(
            error,
            "Impossibile salvare le note del hiring manager",
          ),
        });
      }
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
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
        showClear
      />

      <InputWithTagField
        control={form.control}
        name="redFlags"
        label="Segnali di allarme"
        placeholder="Premi invio dopo ogni punto"
        description="Rischi, segnali di allarme o dubbi"
        showClear
      />

      <SelectField
        control={form.control}
        name="hireRecommendation"
        label="Raccomandazione"
        placeholder="Seleziona una raccomandazione"
      >
        <SelectItem value="strong_yes">Sì, decisamente</SelectItem>
        <SelectItem value="yes">Sì</SelectItem>
        <SelectItem value="maybe">Forse</SelectItem>
        <SelectItem value="no">No</SelectItem>
        <SelectItem value="strong_no">No, decisamente</SelectItem>
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
