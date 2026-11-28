"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { LLMModelSelect } from "@/components/ui/llm-model-select";
import { generateInterviewKitAction } from "@/lib/actions/interview-kits";
import {
  generateInterviewKitSchema,
  type GenerateInterviewKitInput,
  type InterviewKitProposal,
} from "@/lib/schemas";
import { DEFAULT_GENERATION_MODEL } from "@/lib/services/ai/models";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { zodResolver } from "@hookform/resolvers/zod";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

type KitGenerationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string;
  onProposal: (proposal: InterviewKitProposal) => void;
};

/**
 * Asks the AI for a personalized kit proposal. It never saves: the editor
 * merges the proposal as unsaved changes.
 */
export function KitGenerationDialog({
  open,
  onOpenChange,
  interviewId,
  onProposal,
}: KitGenerationDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<GenerateInterviewKitInput>({
    resolver: zodResolver(generateInterviewKitSchema),
    defaultValues: { interviewId, specificModel: DEFAULT_GENERATION_MODEL },
  });
  const { control, handleSubmit } = form;

  function onSubmit(input: GenerateInterviewKitInput) {
    startTransition(async () => {
      try {
        const { proposal } = unwrap(await generateInterviewKitAction(input));
        onProposal(proposal);
        onOpenChange(false);
        toast.info("Proposta pronta: rivedi e salva la preparazione");
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Genera la preparazione con AI</DialogTitle>
          <DialogDescription>
            L&apos;AI propone briefing, ipotesi e domande personalizzate a
            partire da CV, test e round precedenti. Nulla viene salvato finché
            non premi &quot;Salva la preparazione&quot;.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <Field>
            <FieldLabel>Modello LLM</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="specificModel"
                render={({ field, fieldState }) => (
                  <>
                    <LLMModelSelect
                      value={field.value || DEFAULT_GENERATION_MODEL}
                      onValueChange={field.onChange}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <p className="bg-warning/10 px-3 py-2 rounded-md text-warning text-sm">
            Le domande AI non ritoccate verranno sostituite; domande del
            modello, manuali e ritoccate restano.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <BrainCircuit className="mr-1 size-4" />
              )}
              Genera proposta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
