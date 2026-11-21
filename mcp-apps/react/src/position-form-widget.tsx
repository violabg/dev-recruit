/**
 * Position form widget: the dashboard's position fields, prefilled by the
 * assistant. "Salva bozza" creates the draft (create_position_draft), then
 * "Pubblica la posizione" opens it (publish_draft, app-only): both are calls
 * a person makes with a button, and the server checks scope and permissions.
 */

import {
  PositionContractField,
  PositionDescriptionField,
  PositionLevelField,
  PositionSkillsFields,
  PositionTitleField,
} from "@/components/positions/position-fields";
import { Button } from "@/components/ui/button";
import type { PositionFormWidget } from "@/lib/mcp/widgets/types";
import { positionFormSchema, type PositionFormData } from "@/lib/schemas/position";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  CircleCheck,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { McpAppActions } from "./use-mcp-app";

type Saved = { positionId: string; title: string; url: string | null };

type Phase =
  | { step: "editing"; error: string | null }
  | { step: "saved"; saved: Saved; publishing: boolean; error: string | null }
  | { step: "published"; saved: Saved };

/** Dashboard page of the saved draft, from the draft preview of the result */
function draftUrl(structured: Record<string, unknown> | undefined): string | null {
  const widget = structured?.widget as { url?: unknown } | undefined;
  return typeof widget?.url === "string" ? widget.url : null;
}

/** Request to the assistant to write the description from the current values */
export function describeRequest(values: PositionFormData): string {
  const known = [
    values.title && `titolo "${values.title}"`,
    values.experienceLevel && `livello ${values.experienceLevel}`,
    values.contractType && `contratto ${values.contractType}`,
    values.skills.length > 0 && `competenze ${values.skills.join(", ")}`,
    values.softSkills?.length && `soft skill ${values.softSkills.join(", ")}`,
  ].filter(Boolean);
  return [
    "Scrivi la job description di questa nuova posizione",
    known.length > 0 ? ` (${known.join("; ")})` : "",
    values.description?.trim() ? `, migliorando questa bozza: ${values.description.trim()}` : "",
    ". Poi riapri il modulo della posizione con gli stessi campi e la descrizione.",
  ].join("");
}

function Header({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex items-start gap-3 bg-band px-5 pt-4 pb-3 border-b border-l-4 border-l-section-positions">
      <Briefcase aria-hidden className="mt-1 size-5 text-section-positions shrink-0" />
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Nuova posizione · dev-recruit
        </p>
        <h1 className="font-display font-semibold text-heading text-lg truncate">{title}</h1>
        {children}
      </div>
    </header>
  );
}

function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="bg-destructive/10 px-3 py-2 rounded-md text-destructive text-sm"
    >
      {children}
    </p>
  );
}

export function PositionFormWidgetView({
  model,
  actions,
}: {
  model: PositionFormWidget;
  actions: McpAppActions;
}) {
  const [phase, setPhase] = useState<Phase>({ step: "editing", error: null });
  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionFormSchema),
    defaultValues: model.prefill,
  });
  const { control, handleSubmit, formState, getValues } = form;
  const title = useWatch({ control, name: "title" });

  async function save(values: PositionFormData) {
    setPhase({ step: "editing", error: null });
    try {
      const outcome = await actions.call(model.tools.save, values);
      const positionId = outcome.structured?.positionId;
      if (!outcome.ok || typeof positionId !== "string") {
        setPhase({ step: "editing", error: outcome.text || "Salvataggio non riuscito." });
        return;
      }
      const saved = { positionId, title: values.title, url: draftUrl(outcome.structured) };
      setPhase({ step: "saved", saved, publishing: false, error: null });
      actions.tellModel(
        `La persona ha salvato dal riquadro la bozza di posizione "${values.title}" (id ${positionId}). Non è ancora pubblicata.`,
      );
    } catch {
      setPhase({ step: "editing", error: "Impossibile raggiungere dev-recruit. Riprova." });
    }
  }

  async function publish(saved: Saved) {
    setPhase({ step: "saved", saved, publishing: true, error: null });
    try {
      const outcome = await actions.call(model.tools.publish, {
        kind: "position",
        id: saved.positionId,
      });
      if (!outcome.ok) {
        setPhase({
          step: "saved",
          saved,
          publishing: false,
          error: outcome.text || "Pubblicazione non riuscita.",
        });
        return;
      }
      setPhase({ step: "published", saved });
      actions.tellModel(
        `La persona ha pubblicato dal riquadro la posizione "${saved.title}" (id ${saved.positionId}).`,
      );
    } catch {
      setPhase({
        step: "saved",
        saved,
        publishing: false,
        error: "Impossibile raggiungere dev-recruit. Riprova.",
      });
    }
  }

  if (phase.step !== "editing") {
    const { saved } = phase;
    const published = phase.step === "published";
    return (
      <article className="bg-card border rounded-xl overflow-hidden text-card-foreground">
        <Header title={saved.title} />
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <CircleCheck aria-hidden className="mt-0.5 size-5 text-success shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-medium">
                {published ? "Posizione pubblicata" : "Bozza salvata"}
              </p>
              <p className="text-muted-foreground text-sm">
                {published
                  ? "La posizione è aperta. Dalla dashboard completa scheda di valutazione, quiz e guida colloquio."
                  : "La posizione è in bozza e non è visibile ai candidati. Pubblicala qui o dalla pagina della posizione."}
              </p>
            </div>
          </div>
          {phase.step === "saved" && phase.error && <ErrorLine>{phase.error}</ErrorLine>}
          <div className="flex flex-wrap justify-end gap-2">
            {saved.url && (
              <Button variant="outline" onClick={() => actions.open(saved.url!)}>
                <ExternalLink aria-hidden />
                Apri in dev-recruit
              </Button>
            )}
            {phase.step === "saved" && (
              <Button onClick={() => publish(saved)} disabled={phase.publishing}>
                {phase.publishing && <Loader2 aria-hidden className="animate-spin" />}
                {phase.publishing ? "Pubblicazione…" : "Pubblica la posizione"}
              </Button>
            )}
          </div>
        </div>
      </article>
    );
  }

  const saving = formState.isSubmitting;

  return (
    <form
      onSubmit={handleSubmit(save)}
      noValidate
      className="bg-card border rounded-xl overflow-hidden text-card-foreground"
    >
      <Header title={title?.trim() || "Nuova posizione"}>
        <p className="text-muted-foreground text-sm">
          Controlla i campi proposti dall&apos;assistente e salva la bozza: non è visibile ai
          candidati finché non la pubblichi.
        </p>
      </Header>

      <div className="flex flex-col gap-5 p-5">
        <PositionTitleField control={control} />
        <div className="gap-5 grid grid-cols-1 sm:grid-cols-2">
          <PositionLevelField
            control={control}
            experienceLevels={model.options.experienceLevels}
          />
          <PositionContractField
            control={control}
            contractTypes={model.options.contractTypes}
          />
        </div>
        <PositionSkillsFields
          control={control}
          allSkills={model.options.allSkills}
          allSoftSkills={model.options.allSoftSkills}
        />
        <div className="flex flex-col gap-2">
          <PositionDescriptionField
            control={control}
            description="Facoltativa: puoi chiederla all'assistente."
            className="min-h-32"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-primary-ink"
              onClick={() => actions.ask(describeRequest(getValues()))}
              disabled={saving}
            >
              <Sparkles aria-hidden />
              Scrivi con l&apos;assistente
            </Button>
          </div>
        </div>

        {phase.error && <ErrorLine>{phase.error}</ErrorLine>}
      </div>

      <footer className="flex flex-wrap justify-end gap-2 bg-muted/40 px-5 py-3 border-t">
        <Button type="button" variant="outline" onClick={() => actions.open(model.url)}>
          <ExternalLink aria-hidden />
          Apri nella dashboard
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 aria-hidden className="animate-spin" />}
          {saving ? "Salvataggio…" : "Salva bozza"}
        </Button>
      </footer>
    </form>
  );
}
