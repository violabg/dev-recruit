import { SECTIONS, type SectionKey } from "@/components/dashboard/sections";
import { cn } from "cn";
import { BrainCircuit } from "lucide-react";

/**
 * The map of the application, section 2 of the guide: a sitemap with the
 * menu groups as columns and every entry as a tile with its sidebar icon and
 * colour, what it is for and the tabs it holds. Plain markup on purpose: the
 * text keeps its size at every width.
 */
type MapItem = {
  section: SectionKey;
  label?: string;
  purpose: string;
  /** Tabs or sub-pages inside the entry */
  children?: string[];
};

type MapGroup = { label: string; dot: string; items: MapItem[] };

const PANORAMICA: MapGroup = {
  label: "Panoramica",
  dot: "bg-primary",
  items: [{ section: "overview", purpose: "Cosa aspetta me, oggi" }],
};

const SELEZIONE: MapGroup = {
  label: "Selezione",
  dot: "bg-section-candidates",
  items: [
    {
      section: "positions",
      purpose: "Le offerte e tutto ciò che serve a valutarle",
      children: ["Dettagli", "Scheda di valutazione", "Selezione", "Quiz", "Guide colloquio"],
    },
    {
      section: "applications",
      purpose: "Il percorso di ogni candidato per una posizione",
      children: ["Panoramica", "CV", "Test", "Colloqui", "Decisione"],
    },
    { section: "candidates", purpose: "Le persone, con dati e CV" },
    { section: "agenda", purpose: "I colloqui in calendario" },
  ],
};

const LIBRERIA: MapGroup = {
  label: "Libreria",
  dot: "bg-section-quizzes",
  items: [
    { section: "quizzes", purpose: "I test da assegnare ai candidati" },
    { section: "assessments", purpose: "I test assegnati e i risultati" },
    { section: "presets", purpose: "Modelli per generare domande" },
  ],
};

const IMPOSTAZIONI: MapGroup = {
  label: "Impostazioni",
  dot: "bg-section-settings",
  items: [
    {
      section: "settings",
      label: "Dati di riferimento",
      purpose: "Gli elenchi usati nei moduli",
    },
  ],
};

function Group({ group }: { group: MapGroup }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        <span aria-hidden className={cn("rounded-full size-2", group.dot)} />
        {group.label}
      </h3>
      <ul className="flex flex-col gap-2">
        {group.items.map((item) => {
          const section = SECTIONS[item.section];
          const Icon = section.icon;
          return (
            <li
              key={item.section}
              className="flex items-start gap-3 bg-background/60 p-3 rounded-lg ring-1 ring-border"
            >
              <span
                className={cn(
                  "grid place-items-center rounded-md size-9 shrink-0 ring-1 ring-inset",
                  section.tile,
                  section.text,
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-semibold text-foreground text-sm leading-tight">
                  {item.label ?? section.label}
                </span>
                <span className="text-muted-foreground text-xs leading-snug">
                  {item.purpose}
                </span>
                {item.children && (
                  <ul className="flex flex-wrap gap-1 mt-1">
                    {item.children.map((child) => (
                      <li
                        key={child}
                        className="bg-muted px-1.5 py-0.5 rounded font-medium text-[0.7rem] text-muted-foreground"
                      >
                        {child}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AppMap() {
  return (
    <div className="flex flex-col gap-5 bg-card p-5 md:p-6 rounded-xl ring-1 ring-border">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center bg-primary rounded-lg size-9 text-primary-foreground aspect-square">
          <BrainCircuit className="size-5" />
        </span>
        <span className="font-display font-extrabold text-heading text-lg tracking-[-0.02em]">
          DevRecruit
        </span>
        <span className="text-muted-foreground text-sm">· menu laterale</span>
      </div>

      <div className="gap-5 grid md:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Group group={PANORAMICA} />
          <Group group={LIBRERIA} />
          <Group group={IMPOSTAZIONI} />
        </div>
        <Group group={SELEZIONE} />
      </div>
    </div>
  );
}
