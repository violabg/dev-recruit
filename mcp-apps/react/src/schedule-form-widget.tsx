/**
 * Scheduling form widget: the dashboard's scheduling fields, prefilled by
 * the assistant. "Pianifica colloquio" saves the proposal
 * (propose_interview_slot) and confirms it (publish_draft, app-only): a
 * person presses the button, the server checks scope and permissions. No
 * email is sent.
 */

import {
  InterviewGuideFields,
  InterviewWhenFields,
  toDateTimeLocalValue,
  withLocalScheduledAt,
} from "@/components/interviews/interview-when-fields";
import { Button } from "@/components/ui/button";
import type { ScheduleFormWidget } from "@/lib/mcp/widgets/types";
import { scheduleInterviewSchema, type ScheduleInterviewInput } from "@/lib/schemas/interview";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, CalendarPlus, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { DoneLine, ErrorLine, WidgetHeader } from "./chrome";
import type { McpAppActions } from "./use-mcp-app";

type Phase =
  | { step: "editing"; error: string | null; proposalId: string | null }
  | { step: "scheduled"; url: string | null };

const UNREACHABLE = "Impossibile raggiungere dev-recruit. Riprova.";

export function ScheduleFormWidgetView({
  model,
  actions,
}: {
  model: ScheduleFormWidget;
  actions: McpAppActions;
}) {
  const [phase, setPhase] = useState<Phase>({ step: "editing", error: null, proposalId: null });
  const form = useForm<ScheduleInterviewInput>({
    resolver: withLocalScheduledAt(zodResolver(scheduleInterviewSchema)),
    defaultValues: {
      applicationId: model.application.id,
      ...model.prefill,
      scheduledAt: model.prefill.scheduledAt ? toDateTimeLocalValue(model.prefill.scheduledAt) : "",
    },
  });
  const { control, handleSubmit, setValue, formState } = form;
  const users = model.teamMembers.map((member) => ({ ...member, email: "" }));
  const noGuides = model.guides.length === 0;

  /** Saves the proposal once, then confirms it: a retry only confirms */
  async function schedule(values: ScheduleInterviewInput) {
    let proposalId = phase.step === "editing" ? phase.proposalId : null;
    try {
      if (!proposalId) {
        const proposed = await actions.call(model.tools.propose, values);
        const id = proposed.structured?.proposalId;
        if (!proposed.ok || typeof id !== "string") {
          setPhase({ step: "editing", error: proposed.text || "Salvataggio non riuscito.", proposalId: null });
          return;
        }
        proposalId = id;
      }
      const confirmed = await actions.call(model.tools.confirm, { kind: "proposal", id: proposalId });
      if (!confirmed.ok) {
        setPhase({
          step: "editing",
          error: `${confirmed.text || "Pianificazione non riuscita."} La proposta resta in attesa nella candidatura.`,
          proposalId,
        });
        return;
      }
      const url = confirmed.structured?.url;
      setPhase({ step: "scheduled", url: typeof url === "string" ? url : null });
      actions.tellModel(
        `La persona ha pianificato dal riquadro il colloquio di ${model.application.candidateName} (round ${values.round}, ${values.scheduledAt}). Nessuna email è stata inviata.`,
      );
    } catch {
      setPhase({ step: "editing", error: UNREACHABLE, proposalId });
    }
  }

  const header = (
    <WidgetHeader
      icon={CalendarPlus}
      section="candidates"
      eyebrow={`Nuovo colloquio · ${model.application.positionTitle}`}
      title={model.application.candidateName}
    >
      {phase.step === "editing" && (
        <p className="text-muted-foreground text-sm">
          Controlla guida, data e partecipanti proposti dall&apos;assistente e pianifica.
          L&apos;app non invia email.
        </p>
      )}
    </WidgetHeader>
  );

  if (phase.step === "scheduled") {
    return (
      <article className="bg-card border rounded-xl overflow-hidden text-card-foreground">
        {header}
        <div className="flex flex-col gap-4 p-5">
          <DoneLine icon={CalendarCheck} title="Colloquio pianificato">
            Nessuna email è stata inviata: dalla preparazione puoi copiare il riepilogo o
            scaricare il file .ics da condividere.
          </DoneLine>
          {phase.url && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => actions.open(phase.url!)}>
                <ExternalLink aria-hidden />
                Apri la preparazione
              </Button>
            </div>
          )}
        </div>
      </article>
    );
  }

  const saving = formState.isSubmitting;

  return (
    <form
      onSubmit={handleSubmit(schedule)}
      noValidate
      className="bg-card border rounded-xl overflow-hidden text-card-foreground"
    >
      {header}

      <div className="flex flex-col gap-6 p-5">
        {noGuides ? (
          <ErrorLine>
            La posizione non ha guide colloquio: creane una dalla pagina della posizione, poi
            torna a pianificare.
          </ErrorLine>
        ) : (
          <>
            <InterviewGuideFields
              control={control}
              setValue={setValue}
              guides={model.guides}
              disabled={saving}
            />
            <InterviewWhenFields
              control={control}
              setValue={setValue}
              errors={formState.errors}
              users={users}
              disabled={saving}
            />
          </>
        )}

        {model.pending.length > 0 && (
          <div className="flex flex-col gap-1 bg-muted/40 px-3 py-2 rounded-md text-sm">
            <p className="font-medium">Proposte già in attesa</p>
            <ul className="text-muted-foreground">
              {model.pending.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {phase.error && <ErrorLine>{phase.error}</ErrorLine>}
      </div>

      <footer className="flex flex-wrap justify-end gap-2 bg-muted/40 px-5 py-3 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => actions.open(noGuides ? model.guidesUrl : model.url)}
        >
          <ExternalLink aria-hidden />
          {noGuides ? "Apri la posizione" : "Apri nella dashboard"}
        </Button>
        {!noGuides && (
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 aria-hidden className="animate-spin" /> : <CalendarPlus aria-hidden />}
            {saving ? "Pianificazione…" : "Pianifica colloquio"}
          </Button>
        )}
      </footer>
    </form>
  );
}
