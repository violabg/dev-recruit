"use client";

import { StationTrack } from "@/components/flow";
import { ApplyForm } from "@/components/recruiting/apply-form";
import {
  PositionDetails,
  positionMeta,
} from "@/components/recruiting/position-details";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { PublicPosition } from "@/lib/data/positions";
import { cn } from "cn";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useRef, useState } from "react";

/** Same limit as the candidate schema */
const MAX_POSITIONS = 10;

/**
 * The public apply flow in two steps: pick one or more open positions from
 * the list, then fill in personal data and CV.
 */
export function ApplyFlow({ positions }: { positions: PublicPosition[] }) {
  const [chosenIds, setChosenIds] = useState<string[]>([]);
  const [step, setStep] = useState<"choose" | "details">("choose");
  const topRef = useRef<HTMLDivElement>(null);

  const chosen = chosenIds
    .map((id) => positions.find((position) => position.id === id))
    .filter((position): position is PublicPosition => !!position);

  const goTo = (next: "choose" | "details") => {
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggle = (id: string) =>
    setChosenIds((ids) =>
      ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id],
    );

  const remove = (id: string) => {
    const rest = chosenIds.filter((other) => other !== id);
    setChosenIds(rest);
    if (rest.length === 0) goTo("choose");
  };

  return (
    <div ref={topRef} className="flex flex-col gap-8 mx-auto max-w-3xl scroll-mt-6">
      <StationTrack
        label="Passi della candidatura"
        className="mx-auto w-full max-w-sm"
        stations={[
          {
            key: "choose",
            label: "Scegli le posizioni",
            state: step === "choose" ? "current" : "done",
          },
          {
            key: "details",
            label: "I tuoi dati",
            state: step === "details" ? "current" : "todo",
          },
        ]}
      />

      {step === "choose" ? (
        <section aria-labelledby="open-positions" className="pb-24">
          <h2
            id="open-positions"
            className="mb-4 font-display font-bold text-heading text-xl"
          >
            Posizioni aperte
          </h2>
          <ul className="flex flex-col gap-3">
            {positions.map((position, index) => (
              <li key={position.id}>
                <PositionRow
                  position={position}
                  defaultOpen={index === 0}
                  isChosen={chosenIds.includes(position.id)}
                  canAdd={chosenIds.length < MAX_POSITIONS}
                  onToggle={() => toggle(position.id)}
                />
              </li>
            ))}
          </ul>

          {chosen.length > 0 && (
            <div className="bottom-4 sticky flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3 bg-card shadow-lg mt-6 p-4 border rounded-xl">
              <p className="font-medium text-sm" aria-live="polite">
                {chosen.length === 1
                  ? "1 posizione scelta"
                  : `${chosen.length} posizioni scelte`}
              </p>
              <Button onClick={() => goTo("details")}>Continua</Button>
            </div>
          )}
        </section>
      ) : (
        <section className="bg-card p-5 sm:p-6 border rounded-xl">
          <ApplyForm
            positionIds={chosenIds}
            header={
              <div>
                <h2 className="mb-3 font-display font-bold text-heading text-xl">
                  Ti candidi per
                </h2>
                <ul className="flex flex-col gap-2">
                  {chosen.map((position) => (
                    <li
                      key={position.id}
                      className="flex items-center gap-3 bg-primary/5 px-4 py-3 border border-primary/25 rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-heading">
                          {position.title}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {positionMeta(position)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="ml-auto"
                        aria-label={`Togli ${position.title}`}
                        onClick={() => remove(position.id)}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="link"
                  className="mt-2 px-0"
                  onClick={() => goTo("choose")}
                >
                  <Plus />
                  Aggiungi altre posizioni
                </Button>
              </div>
            }
          />
        </section>
      )}
    </div>
  );
}

function PositionRow({
  position,
  defaultOpen,
  isChosen,
  canAdd,
  onToggle,
}: {
  position: PublicPosition;
  defaultOpen: boolean;
  isChosen: boolean;
  canAdd: boolean;
  onToggle: () => void;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn(
        "bg-card border rounded-xl overflow-hidden",
        isChosen && "border-primary shadow-[inset_4px_0_0_var(--primary)]",
      )}
    >
      <CollapsibleTrigger className="group/trigger flex items-center gap-4 hover:bg-muted/40 px-5 py-4 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
        <div className="min-w-0">
          <p className="font-display font-semibold text-heading text-lg">
            {position.title}
          </p>
          <p className="text-muted-foreground text-sm">
            {positionMeta(position)}
          </p>
        </div>
        {isChosen && (
          <span className="flex items-center gap-1 ml-auto font-medium text-primary-ink text-xs">
            <Check className="size-3.5" />
            Scelta
          </span>
        )}
        <ChevronDown
          aria-hidden
          className={cn(
            "size-5 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-180 shrink-0",
            !isChosen && "ml-auto",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-5 pt-4 pb-5 border-t">
        <PositionDetails position={position} />
        <div className="flex justify-end mt-5">
          {isChosen ? (
            <Button variant="outline" onClick={onToggle}>
              <X />
              Togli dalla candidatura
            </Button>
          ) : (
            <Button onClick={onToggle} disabled={!canAdd}>
              <Plus />
              Candidati per questa posizione
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
