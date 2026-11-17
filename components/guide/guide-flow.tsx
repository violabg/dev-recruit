import { cn } from "cn";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Fragment } from "react";

/**
 * A left-to-right flow of stages drawn in plain markup: every stage is a
 * column that can hold several boxes, arrows sit between the columns. It
 * fills the column width and keeps the text at full size; on a phone the
 * stages stack top to bottom. Same colour meaning as the Mermaid diagrams.
 */
export type FlowTone = "entity" | "step" | "outcome";

const TONE_CLASS: Record<FlowTone, string> = {
  entity: "bg-primary text-primary-foreground ring-primary",
  step: "bg-muted/60 text-foreground ring-border",
  outcome: "bg-success/10 text-foreground ring-success/50",
};

const TONE_DETAIL: Record<FlowTone, string> = {
  entity: "text-primary-foreground/85",
  step: "text-muted-foreground",
  outcome: "text-muted-foreground",
};

const TONE_LABEL: Record<FlowTone, string> = {
  entity: "Entità principale",
  step: "Passo o prova",
  outcome: "Esito positivo",
};

const TONE_SWATCH: Record<FlowTone, string> = {
  entity: "bg-primary border-primary",
  step: "bg-muted border-border",
  outcome: "bg-success/15 border-success/60",
};

export type FlowBox = { title: string; detail?: string; tone: FlowTone };

export function GuideFlow({
  title,
  stages,
}: {
  title: string;
  stages: FlowBox[][];
}) {
  const tones = [
    ...new Set(stages.flatMap((stage) => stage.map((box) => box.tone))),
  ];

  return (
    <figure className="flex flex-col gap-2 m-0">
      <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Schema · {title}
      </span>
      <div className="flex md:flex-row flex-col md:items-stretch gap-2 bg-card p-4 rounded-xl ring-1 ring-border">
        {stages.map((stage, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <div
                aria-hidden
                className="flex justify-center items-center text-muted-foreground shrink-0"
              >
                <ArrowRight className="hidden md:block size-4" />
                <ArrowDown className="md:hidden size-4" />
              </div>
            )}
            <div className="flex flex-col flex-1 justify-center gap-2 min-w-0">
              {stage.map((box) => (
                <div
                  key={box.title}
                  className={cn(
                    "flex flex-col gap-0.5 px-3 py-2.5 rounded-lg ring-1 ring-inset text-center",
                    TONE_CLASS[box.tone],
                  )}
                >
                  <span className="font-semibold text-sm leading-tight">
                    {box.title}
                  </span>
                  {box.detail && (
                    <span
                      className={cn("text-xs leading-snug", TONE_DETAIL[box.tone])}
                    >
                      {box.detail}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Fragment>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
        {tones.map((tone) => (
          <li key={tone} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("border rounded-sm size-3", TONE_SWATCH[tone])}
            />
            {TONE_LABEL[tone]}
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">{title}</figcaption>
    </figure>
  );
}
