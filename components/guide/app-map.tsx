import { cn } from "cn";
import { BrainCircuit } from "lucide-react";
import { Fragment } from "react";

/**
 * The map of the application, section 2 of the guide.
 *
 * It is plain markup on purpose: Mermaid laid this out as a wide fan whose
 * labels were scaled to a few pixels, and no layout engine gives a reliable
 * result for a menu. Here the branches stack vertically, the text keeps its
 * size at every width, and the colours are the dashboard section hues.
 */
type Tone = "primary" | "candidates" | "quizzes" | "settings";

const TONES: Record<Tone, { label: string; dot: string }> = {
  primary: {
    label: "bg-primary/10 text-primary ring-primary/25",
    dot: "bg-primary",
  },
  candidates: {
    label:
      "bg-section-candidates/10 text-section-candidates ring-section-candidates/25",
    dot: "bg-section-candidates",
  },
  quizzes: {
    label:
      "bg-section-quizzes/10 text-section-quizzes ring-section-quizzes/25",
    dot: "bg-section-quizzes",
  },
  settings: {
    label: "bg-section-settings/10 text-section-settings ring-section-settings/25",
    dot: "bg-section-settings",
  },
};

type BranchItem = {
  label: string;
  /** Menu entries that live inside the item */
  children?: string[];
};

const BRANCHES: { label: string; tone: Tone; items: BranchItem[] }[] = [
  {
    label: "Panoramica",
    tone: "primary",
    items: [{ label: "Le mie azioni" }],
  },
  {
    label: "Selezione",
    tone: "candidates",
    items: [
      {
        label: "Posizioni",
        children: [
          "Scheda di valutazione",
          "Selezione kanban",
          "Quiz",
          "Guide colloquio",
        ],
      },
      {
        label: "Candidature",
        children: ["CV", "Test", "Colloqui", "Decisione"],
      },
      { label: "Candidati" },
      { label: "Agenda colloqui" },
    ],
  },
  {
    label: "Libreria",
    tone: "quizzes",
    items: [{ label: "Quiz" }, { label: "Test inviati" }, { label: "Preset" }],
  },
  {
    label: "Impostazioni",
    tone: "settings",
    items: [{ label: "Dati di riferimento" }],
  },
];

export function AppMap() {
  return (
    <div className="bg-card p-5 md:p-6 rounded-xl ring-1 ring-border">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center bg-primary rounded-lg size-9 text-primary-foreground aspect-square">
          <BrainCircuit className="size-5" />
        </span>
        <span className="font-display font-extrabold text-heading text-lg tracking-[-0.02em]">
          DevRecruit
        </span>
      </div>

      <ol className="border-border mt-5 ml-2 pl-5 border-l space-y-5">
        {BRANCHES.map((branch) => (
          <li key={branch.label} className="relative">
            <span
              aria-hidden
              className={cn(
                "top-2 -left-[25px] absolute rounded-full size-2.5 ring-4 ring-card",
                TONES[branch.tone].dot,
              )}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
              <span
                className={cn(
                  "inline-flex items-center shrink-0 px-2.5 py-1 rounded-md ring-1 ring-inset font-semibold text-xs w-fit",
                  TONES[branch.tone].label,
                )}
              >
                {branch.label}
              </span>
              <ul className="flex flex-wrap gap-2">
                {branch.items.map((item) => (
                  <li
                    key={item.label}
                    className="bg-muted/40 px-3 py-2 rounded-lg ring-1 ring-border"
                  >
                    <p className="font-medium text-foreground text-sm">
                      {item.label}
                    </p>
                    {item.children && (
                      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-muted-foreground text-xs">
                        {item.children.map((child, index) => (
                          <Fragment key={child}>
                            {index > 0 && <span aria-hidden>·</span>}
                            <span>{child}</span>
                          </Fragment>
                        ))}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
