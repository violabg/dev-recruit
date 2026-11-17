import { GUIDE_SECTION_KIND_LABEL } from "@/components/interview-guides/guide-section-kind";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewPreparation } from "@/lib/data/interviews";
import { cn } from "cn";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Info,
  Lightbulb,
  ListChecks,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  getKitItemOriginLabel,
  MISSING_SOURCE_LABEL,
} from "./interview-presentation";

type Kit = NonNullable<InterviewPreparation["kit"]>;
type KitCriterion = InterviewPreparation["criteria"][number];

const CHECKLIST_GROUPS = [
  { category: "communicate", title: "Da comunicare" },
  { category: "logistics", title: "Logistica" },
] as const;

const ANCHORS = [
  {
    key: "weak",
    label: "Debole",
    className: "border-l-destructive bg-destructive/5",
    labelClassName: "text-destructive",
  },
  {
    key: "medium",
    label: "Media",
    className: "border-l-warning bg-warning/5",
    labelClassName: "text-warning",
  },
  {
    key: "strong",
    label: "Forte",
    className: "border-l-success bg-success/5",
    labelClassName: "text-success",
  },
] as const;

const sectionAnchor = (sectionId: string) => `kit-sezione-${sectionId}`;

/** Small uppercase label that separates a block's name from its content. */
function Label({ children }: { children: ReactNode }) {
  return (
    <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
      {children}
    </span>
  );
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display font-bold text-heading text-2xl tabular-nums leading-none">
        {value}
      </span>
      <span className="mt-1 text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

/**
 * Read-only preparation of an interview: outline, briefing, hypotheses,
 * questions by section with their anchors, checklist. The editor is on
 * /prepare/edit.
 */
export function KitView({
  kit,
  criteria,
}: {
  kit: Kit;
  criteria: KitCriterion[];
}) {
  const criterionById = new Map(
    criteria.map((criterion) => [criterion.id, criterion]),
  );
  const criterionLabel = (id: string) => {
    const criterion = criterionById.get(id);
    if (!criterion) return "Criterio archiviato";
    return criterion.archived
      ? `${criterion.name} (archiviato)`
      : criterion.name;
  };

  const items = kit.items;
  const requiredCount = items.filter((item) => item.required).length;
  const doneChecklist = kit.checklist.filter((entry) => entry.done).length;
  const totalMinutes = kit.sections.reduce(
    (sum, section) => sum + section.minutes,
    0,
  );
  const sections = kit.sections.map((section) => ({
    section,
    items: items.filter((item) => item.sectionId === section.id),
  }));

  return (
    <div className="flex flex-col gap-8">
      {/* Outline: what the interview looks like at a glance */}
      <Card>
        <CardHeader>
          <CardTitle>Scaletta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="gap-4 grid grid-cols-2 sm:grid-cols-4">
            <Stat value={totalMinutes} label="minuti previsti" />
            <Stat value={items.length} label="domande" />
            <Stat value={requiredCount} label="obbligatorie" />
            <Stat
              value={`${doneChecklist}/${kit.checklist.length}`}
              label="checklist completata"
            />
          </div>

          {sections.length > 0 && (
            <ol className="flex flex-col border-t">
              {sections.map(({ section, items: sectionItems }, index) => (
                <li key={section.id} className="border-b last:border-b-0">
                  <a
                    href={`#${sectionAnchor(section.id)}`}
                    className="group flex items-center gap-3 hover:bg-muted/60 -mx-2 px-2 py-2.5 rounded-md transition-colors"
                  >
                    <span className="flex justify-center items-center bg-primary/10 rounded-full size-6 shrink-0 font-semibold text-primary text-xs tabular-nums">
                      {index + 1}
                    </span>
                    <span className="flex-1 min-w-0 font-medium truncate">
                      {section.title}
                    </span>
                    <span className="hidden sm:inline text-muted-foreground text-xs">
                      {sectionItems.length}{" "}
                      {sectionItems.length === 1 ? "domanda" : "domande"}
                    </span>
                    <span className="w-14 text-muted-foreground text-xs text-right tabular-nums">
                      {section.minutes} min
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>
                </li>
              ))}
            </ol>
          )}

          {kit.missingSources.length > 0 && (
            <p className="flex items-start gap-2 text-muted-foreground text-sm">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Generato senza:{" "}
                {kit.missingSources
                  .map((source) => MISSING_SOURCE_LABEL[source])
                  .join(", ")}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* What to know before starting */}
      <div className="gap-6 grid xl:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-4 text-primary" aria-hidden />
              Briefing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kit.briefing.length === 0 ? (
              <p className="text-muted-foreground">Nessun punto di briefing.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {kit.briefing.map((point, index) => (
                  <li key={index} className="flex gap-3 leading-relaxed">
                    <span className="pt-0.5 w-4 shrink-0 font-semibold text-primary text-xs tabular-nums">
                      {index + 1}.
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4 text-primary" aria-hidden />
              Ipotesi da verificare
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {kit.hypotheses.length === 0 ? (
              <p className="text-muted-foreground">Nessuna ipotesi.</p>
            ) : (
              kit.hypotheses.map((hypothesis, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 pl-3 border-primary/60 border-l-2"
                >
                  <p className="font-medium leading-relaxed">
                    {hypothesis.hypothesis}
                  </p>
                  {hypothesis.criterionId && (
                    <div>
                      <Badge variant="secondary">
                        {criterionLabel(hypothesis.criterionId)}
                      </Badge>
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <Label>Come verificarla</Label>
                    <p className="text-muted-foreground leading-relaxed">
                      {hypothesis.howToVerify || "—"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Questions, one chapter per section */}
      {sections.map(({ section, items: sectionItems }, sectionIndex) => (
        <section
          key={section.id}
          id={sectionAnchor(section.id)}
          className="flex flex-col gap-3 scroll-mt-20"
        >
          <header className="flex flex-wrap items-end gap-x-3 gap-y-1 pb-2 border-b-2 border-primary/30">
            <span className="font-display font-bold text-primary text-sm tabular-nums">
              {String(sectionIndex + 1).padStart(2, "0")}
            </span>
            <h2 className="font-display font-bold text-heading text-xl leading-tight tracking-[-0.02em]">
              {section.title}
            </h2>
            <span className="ml-auto text-muted-foreground text-sm">
              {GUIDE_SECTION_KIND_LABEL[section.kind]} · {section.minutes} min ·{" "}
              {sectionItems.length}{" "}
              {sectionItems.length === 1 ? "domanda" : "domande"}
            </span>
          </header>

          {sectionItems.length === 0 && (
            <p className="py-2 text-muted-foreground text-sm">
              Nessuna domanda in questa sezione.
            </p>
          )}

          {sectionItems.map((item, index) => {
            const hasAnchors =
              item.anchors.weak || item.anchors.medium || item.anchors.strong;

            return (
              <Card
                key={item.id}
                className={cn(item.required && "ring-primary/40")}
              >
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 font-display font-bold text-muted-foreground text-sm tabular-nums">
                      {sectionIndex + 1}.{index + 1}
                    </span>
                    <div className="flex flex-col flex-1 gap-2 min-w-0">
                      <p className="font-semibold text-foreground text-base leading-snug">
                        {item.text || "Domanda senza testo"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.required && <Badge>Obbligatoria</Badge>}
                        <Badge variant="outline">
                          {getKitItemOriginLabel(item.origin, item.sourceRound)}
                        </Badge>
                        {item.edited && (
                          <span className="text-muted-foreground text-xs">
                            ritoccata
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.rationale && (
                    <p className="bg-muted/60 px-3 py-2 rounded-md text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Perché:{" "}
                      </span>
                      {item.rationale}
                    </p>
                  )}

                  {item.followUps.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <Label>Approfondimenti</Label>
                      <ul className="flex flex-col gap-1.5">
                        {item.followUps.map((followUp, followUpIndex) => (
                          <li
                            key={followUpIndex}
                            className="flex items-start gap-2 leading-relaxed"
                          >
                            <ChevronRight
                              className="mt-0.5 size-4 text-primary shrink-0"
                              aria-hidden
                            />
                            <span>{followUp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasAnchors && (
                    <div className="flex flex-col gap-2">
                      <Label>Come valutare la risposta</Label>
                      <div className="gap-2 grid md:grid-cols-3">
                        {ANCHORS.map((anchor) => (
                          <div
                            key={anchor.key}
                            className={cn(
                              "flex flex-col gap-1 px-3 py-2 border-l-4 rounded-md",
                              anchor.className,
                            )}
                          >
                            <span
                              className={cn(
                                "font-semibold text-xs uppercase tracking-wide",
                                anchor.labelClassName,
                              )}
                            >
                              {anchor.label}
                            </span>
                            <p className="leading-relaxed">
                              {item.anchors[anchor.key] || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.criterionIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                      <Label>Criteri</Label>
                      {item.criterionIds.map((criterionId) => (
                        <Badge key={criterionId} variant="secondary">
                          {criterionLabel(criterionId)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-5 text-primary" aria-hidden />
            Checklist
            <span className="font-sans font-normal text-muted-foreground text-sm tabular-nums">
              {doneChecklist}/{kit.checklist.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="gap-6 grid md:grid-cols-2">
          {CHECKLIST_GROUPS.map((group) => {
            const groupItems = kit.checklist.filter(
              (entry) => entry.category === group.category,
            );

            return (
              <div key={group.category} className="flex flex-col gap-2">
                <Label>{group.title}</Label>
                {groupItems.length === 0 && (
                  <p className="text-muted-foreground">Nessuna voce.</p>
                )}
                <ul className="flex flex-col gap-2">
                  {groupItems.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2">
                      {entry.done ? (
                        <CheckCircle2
                          className="mt-0.5 size-4 text-success shrink-0"
                          aria-label="Fatto"
                        />
                      ) : (
                        <Circle
                          className="mt-0.5 size-4 text-muted-foreground shrink-0"
                          aria-label="Da fare"
                        />
                      )}
                      <span
                        className={
                          entry.done ? "text-muted-foreground line-through" : ""
                        }
                      >
                        {entry.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
