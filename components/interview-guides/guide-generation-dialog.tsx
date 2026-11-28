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
import { TextareaField } from "@/components/ui/rhf-inputs";
import { generateInterviewGuideAction } from "@/lib/actions/interview-guides";
import {
  generateInterviewGuideSchema,
  type GeneratedInterviewGuide,
  type GenerateInterviewGuideInput,
} from "@/lib/schemas";
import { DEFAULT_GENERATION_MODEL } from "@/lib/services/ai/models";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { zodResolver } from "@hookform/resolvers/zod";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useMemo, useTransition } from "react";
import { Controller, type FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";

type GuideGenerationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string;
  /** Current values of the guide form */
  title: string;
  round: number;
  durationMinutes: number;
  /** The editor already has sections: they will be replaced */
  hasContent: boolean;
  onGenerated: (guide: GeneratedInterviewGuide) => void;
};

/** First message of a validation failure (fields not shown in the dialog). */
function firstErrorMessage(
  errors: FieldErrors<GenerateInterviewGuideInput>,
): string | undefined {
  for (const error of Object.values(errors)) {
    if (error && typeof error.message === "string" && error.message) {
      return error.message;
    }
  }
  return undefined;
}

/**
 * Options and confirmation of "Genera dai criteri". It never saves: the
 * result goes to the editor as unsaved changes.
 */
export function GuideGenerationDialog({
  open,
  onOpenChange,
  positionId,
  title,
  round,
  durationMinutes,
  hasContent,
  onGenerated,
}: GuideGenerationDialogProps) {
  const [isPending, startTransition] = useTransition();

  const values = useMemo<GenerateInterviewGuideInput>(
    () => ({
      positionId,
      title,
      round,
      durationMinutes,
      instructions: "",
      specificModel: DEFAULT_GENERATION_MODEL,
    }),
    [positionId, title, round, durationMinutes],
  );

  const form = useForm<GenerateInterviewGuideInput>({
    resolver: zodResolver(generateInterviewGuideSchema),
    values,
    // Keep the instructions and the model the user already changed
    resetOptions: { keepDirtyValues: true },
  });
  const { control, handleSubmit } = form;

  function onSubmit(input: GenerateInterviewGuideInput) {
    startTransition(async () => {
      try {
        const { sections } = unwrap(
          await generateInterviewGuideAction({
            ...input,
            instructions: input.instructions || undefined,
          }),
        );
        onGenerated({ sections });
        onOpenChange(false);
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function onInvalid(errors: FieldErrors<GenerateInterviewGuideInput>) {
    toast.error(
      firstErrorMessage(errors) ??
        "Controlla titolo, round e durata della traccia",
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Genera dai criteri</DialogTitle>
          <DialogDescription>
            L&apos;AI propone sezioni e domande a partire dai criteri della
            posizione. Nulla viene salvato finché non premi
            &quot;Salva traccia&quot;.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="flex flex-col gap-4"
          noValidate
        >
          <TextareaField
            control={control}
            name="instructions"
            label="Istruzioni (opzionale)"
            className="min-h-20"
          />

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

          {hasContent && (
            <p className="bg-warning/10 px-3 py-2 rounded-md text-warning text-sm">
              Le sezioni attuali saranno sostituite
            </p>
          )}

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
              Genera
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
