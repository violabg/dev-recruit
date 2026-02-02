"use client";

import { Button } from "@/components/ui/button";
import {
  InputWithTagField,
  SliderField,
  TextareaField,
} from "@/components/ui/rhf-inputs";
import { upsertBehavioralRubricAction } from "@/lib/actions/behavioral-rubrics";
import { behavioralRubricSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = behavioralRubricSchema;

type FormData = z.infer<typeof formSchema>;

type BehavioralRubricFormProps = {
  candidateId: string;
  positionId: string;
  defaultValues?: Partial<FormData>;
};

export const BehavioralRubricForm = ({
  candidateId,
  positionId,
  defaultValues,
}: BehavioralRubricFormProps) => {
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      candidateId,
      positionId,
      communicationScore: 3,
      collaborationScore: 3,
      problemSolvingScore: 3,
      cultureFitScore: 3,
      leadershipScore: undefined,
      strengthExamples: [],
      improvementAreas: [],
      overallComments: "",
      ...defaultValues,
    },
  });

  const onSubmit: SubmitHandler<FormData> = (values) => {
    startTransition(async () => {
      try {
        await upsertBehavioralRubricAction(values);
        toast.success("Rubrica comportamentale salvata");
      } catch (error) {
        toast.error("Errore salvataggio rubrica", {
          description:
            error instanceof Error
              ? error.message
              : "Impossibile salvare la rubrica comportamentale",
        });
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="gap-4 grid md:grid-cols-2">
        <SliderField
          control={form.control}
          name="communicationScore"
          label={`Comunicazione: ${form.watch("communicationScore") ?? 3}`}
          min={1}
          max={5}
          step={1}
          description="Chiarezza, ascolto, capacità di spiegare"
        />

        <SliderField
          control={form.control}
          name="collaborationScore"
          label={`Collaborazione: ${form.watch("collaborationScore") ?? 3}`}
          min={1}
          max={5}
          step={1}
          description="Teamwork, feedback, approccio cooperativo"
        />

        <SliderField
          control={form.control}
          name="problemSolvingScore"
          label={`Problem Solving: ${form.watch("problemSolvingScore") ?? 3}`}
          min={1}
          max={5}
          step={1}
          description="Struttura mentale, trade-off, decisioni"
        />

        <SliderField
          control={form.control}
          name="cultureFitScore"
          label={`Culture Fit: ${form.watch("cultureFitScore") ?? 3}`}
          min={1}
          max={5}
          step={1}
          description="Allineamento a valori e modalità di lavoro"
        />
      </div>

      <SliderField
        control={form.control}
        name="leadershipScore"
        label={`Leadership (opzionale): ${form.watch("leadershipScore") ?? "—"}`}
        min={1}
        max={5}
        step={1}
        description="Solo per ruoli senior o lead"
      />

      <InputWithTagField
        control={form.control}
        name="strengthExamples"
        label="Esempi di punti di forza"
        placeholder="Premi invio dopo ogni esempio"
        description="Episodi concreti osservati durante il colloquio"
        showClear
      />

      <InputWithTagField
        control={form.control}
        name="improvementAreas"
        label="Aree di miglioramento"
        placeholder="Premi invio dopo ogni area"
        description="Aspetti su cui il candidato potrebbe crescere"
        showClear
      />

      <TextareaField
        control={form.control}
        name="overallComments"
        label="Commenti generali"
        placeholder="Osservazioni aggiuntive e contesto"
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvataggio..." : "Salva rubrica"}
      </Button>
    </form>
  );
};
