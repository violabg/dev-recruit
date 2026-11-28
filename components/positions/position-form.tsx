"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPositionAction, updatePositionAction } from "@/lib/actions/positions";
import { Position } from "@/lib/prisma/client";
import {
  PositionFormData,
  positionFormSchema,
  type PositionDescriptionInput,
} from "@/lib/schemas";
import { errorMessage } from "@/lib/utils/action-result";
import { zodResolver } from "@hookform/resolvers/zod";
import { Brain, Briefcase, Loader2, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  PositionContractField,
  PositionDescriptionField,
  PositionLevelField,
  PositionSkillsFields,
  PositionTitleField,
  type PositionFieldOptions,
} from "./position-fields";

type PositionFormProps = {
  position?: Position;
  onCancel?: () => void;
} & Partial<PositionFieldOptions>;

/** Italian message the route sent for a failed request, when it sent one. */
async function generationError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.error === "string" && data.error) return data.error;
  } catch {
    // Body is not JSON: fall through to the status
  }
  return `La generazione non è riuscita (errore ${response.status}).`;
}

export function PositionForm({
  position,
  onCancel,
  allSkills = [],
  allSoftSkills = [],
  experienceLevels = [],
  contractTypes = [],
}: PositionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGeneratingDescription, startDescriptionGeneration] = useTransition();

  const isEditing = !!position;

  const pathname = usePathname();

  const defaultValues = useMemo(
    () =>
      isEditing
        ? {
            title: position.title,
            description: position.description || "",
            experienceLevel: position.experienceLevel,
            skills: position.skills || [],
            softSkills: position.softSkills || [],
            contractType: position.contractType || "",
          }
        : {
            title: "",
            description: "",
            experienceLevel: "",
            skills: [],
            softSkills: [],
            contractType: "",
          },
    [isEditing, position],
  );

  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionFormSchema),
    defaultValues,
  });

  const { control, handleSubmit, getValues, setValue } = form;

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form, pathname]);

  function onSubmit(values: PositionFormData) {
    startTransition(async () => {
      // On success the action redirects and returns nothing
      const result = isEditing
        ? await updatePositionAction(position.id, values)
        : await createPositionAction(values);

      if (result && !result.success) {
        toast.error("Impossibile salvare la posizione", {
          description: errorMessage(result.error),
        });
      }
    });
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  async function handleGenerateDescription() {
    // No field is required: the description can be written (or improved)
    // before the position is complete, from whatever detail is on the form.
    const title = getValues("title").trim();
    const experienceLevel = getValues("experienceLevel");
    const skills = getValues("skills");
    const description = getValues("description")?.trim() ?? "";

    startDescriptionGeneration(async () => {
      try {
        const descriptionPayload: PositionDescriptionInput = {
          title,
          experienceLevel,
          skills,
          softSkills: getValues("softSkills"),
          contractType: getValues("contractType"),
          currentDescription: description,
        };

        const response = await fetch("/api/positions/generate-description", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(descriptionPayload),
        });

        if (!response.ok) {
          throw new Error(await generationError(response));
        }

        if (!response.body) {
          throw new Error("La risposta del servizio AI è vuota.");
        }

        // The current text is replaced only once the stream is available: a
        // failed request keeps what the user had written.
        setValue("description", "");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          setValue("description", accumulatedText);
        }

        toast.success("Descrizione generata con successo");
      } catch (error) {
        toast.error("Impossibile generare la descrizione", {
          description: errorMessage(error),
        });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Core Info & Description */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="size-5 text-primary" />
                Dettagli Posizione
              </CardTitle>
            </CardHeader>
            <CardContent className="gap-6 grid grid-cols-1 md:grid-cols-2">
              <div className="md:col-span-2">
                <PositionTitleField control={control} />
              </div>
              <PositionContractField control={control} contractTypes={contractTypes} />
              <PositionLevelField
                control={control}
                experienceLevels={experienceLevels}
              />
            </CardContent>
          </Card>

          <Card className="relative bg-primary/10 border-primary/20 overflow-hidden">
            <div className="top-0 right-0 absolute opacity-10 p-4">
              <Sparkles className="size-24 text-primary" />
            </div>
            <CardHeader className="z-10 relative pb-0">
              <CardTitle className="flex items-center gap-2 text-primary text-lg">
                <Sparkles className="size-5" />
                Descrizione IA
              </CardTitle>
            </CardHeader>
            <CardContent className="z-10 relative flex flex-col gap-4 pt-4">
              <PositionDescriptionField
                control={control}
                className="bg-background/50 backdrop-blur-sm min-h-48"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription || isPending}
                >
                  {isGeneratingDescription ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-4" />
                      Genera con IA
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Skills & Actions */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card className="top-6 sticky">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="size-5 text-primary" />
                Competenze
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <PositionSkillsFields
                control={control}
                allSkills={allSkills}
                allSoftSkills={allSoftSkills}
              />

              <div className="flex flex-col gap-3 pt-6 border-t">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {isEditing ? "Salvataggio..." : "Creazione..."}
                    </>
                  ) : isEditing ? (
                    "Aggiorna posizione"
                  ) : (
                    "Crea posizione"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="w-full"
                >
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
