/**
 * Quiz form widget: the dashboard's generation parameters, without the
 * model choice. "Genera con l'assistente" sends them to the assistant,
 * which writes the questions and shows the preview (save_quiz_draft); the
 * quiz is saved from the preview, by a person.
 */

import { QuizGenerationFields } from "@/components/quiz/quiz-generation-fields";
import { Button } from "@/components/ui/button";
import { chosenQuestionTypes, quizRequest } from "@/lib/mcp/widgets/quiz-request";
import type { QuizFormWidget } from "@/lib/mcp/widgets/types";
import { quizGenerationFormSchema, type QuizGenerationFormData } from "@/lib/schemas/quiz";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, ListChecks, MessageSquareText, Sparkles } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { DoneLine, ErrorLine, WidgetHeader } from "./chrome";
import type { McpAppActions } from "./use-mcp-app";

export function QuizFormWidgetView({
  model,
  actions,
}: {
  model: QuizFormWidget;
  actions: McpAppActions;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<QuizGenerationFormData>({
    resolver: zodResolver(quizGenerationFormSchema),
    defaultValues: model.prefill,
  });
  const { control, handleSubmit } = form;
  const quizTitle = useWatch({ control, name: "quizTitle" });

  function generate(values: QuizGenerationFormData) {
    const request = { ...model.prefill, ...values, instructions: values.instructions ?? "" };
    if (chosenQuestionTypes(request).length === 0) {
      setError("Scegli almeno un tipo di domanda.");
      return;
    }
    setError(null);
    actions.ask(quizRequest(model.position, request, model.previewTool));
    setSent(true);
  }

  const header = (
    <WidgetHeader
      icon={ListChecks}
      section="quizzes"
      eyebrow={`Nuovo test · ${model.position.title}`}
      title={quizTitle?.trim() || "Nuovo test"}
    >
      {!sent && (
        <p className="text-muted-foreground text-sm">
          Scegli i parametri: le domande le scrive l&apos;assistente e le vedi in anteprima
          prima di salvare.
        </p>
      )}
    </WidgetHeader>
  );

  if (sent) {
    return (
      <article className="bg-card border rounded-xl overflow-hidden text-card-foreground">
        {header}
        <div className="flex flex-col gap-4 p-5">
          <DoneLine icon={MessageSquareText} title="Richiesta inviata all'assistente">
            L&apos;assistente scrive le domande e mostra l&apos;anteprima del test qui sotto: lo
            salvi dal riquadro dell&apos;anteprima. Nessun candidato viene invitato.
          </DoneLine>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setSent(false)}>
              Modifica i parametri
            </Button>
            <Button variant="outline" onClick={() => actions.open(model.url)}>
              <ExternalLink aria-hidden />
              Apri in dev-recruit
            </Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(generate)}
      noValidate
      className="bg-card border rounded-xl overflow-hidden text-card-foreground"
    >
      {header}

      <div className="flex flex-col gap-6 p-5">
        <QuizGenerationFields control={control} />
        {error && <ErrorLine>{error}</ErrorLine>}
      </div>

      <footer className="flex flex-wrap justify-end gap-2 bg-muted/40 px-5 py-3 border-t">
        <Button type="button" variant="outline" onClick={() => actions.open(model.url)}>
          <ExternalLink aria-hidden />
          Apri nella dashboard
        </Button>
        <Button type="submit">
          <Sparkles aria-hidden />
          Genera con l&apos;assistente
        </Button>
      </footer>
    </form>
  );
}
