import {
  AnswerAnchors,
  BlockLabel,
  FollowUpList,
  hasAnchors,
} from "@/components/interviews/kit-blocks";
import { CRITERION_PRIORITY_PRESENTATION } from "@/components/scorecard/criterion-presentation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewGuideDetail } from "@/lib/data/interview-guides";
import type { CriterionPriority } from "@/lib/schemas";
import { cn } from "cn";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { GUIDE_SECTION_KIND_LABEL } from "./guide-section-kind";

export type GuideViewCriterion = {
  id: string;
  name: string;
  priority: CriterionPriority;
  archived?: boolean;
};

const sectionAnchor = (sectionId: string) => `guida-sezione-${sectionId}`;

function Stat({
  value,
  label,
  tone,
}: {
  value: ReactNode;
  label: string;
  tone?: "warning";
}) {
  return (
    <div className="flex flex-col">
      <span
        className={cn(
          "font-display font-bold text-heading text-2xl tabular-nums leading-none",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </span>
      <span className="mt-1 text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

/**
 * Read-only interview guide: outline with minutes, scorecard criteria
 * coverage, then each section with its questions, follow-ups and anchors.
 * The editor is on /edit.
 */
export function GuideView({
  guide,
  criteria,
}: {
  guide: InterviewGuideDetail;
  criteria: GuideViewCriterion[];
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

  const questions = guide.sections.flatMap((section) => section.questions);
  const requiredCount = questions.filter((question) => question.required).length;
  const plannedMinutes = guide.sections.reduce(
    (sum, section) => sum + section.minutes,
    0,
  );
  const minutesMismatch = plannedMinutes !== guide.durationMinutes;

  // How many questions gather evidence for each active criterion
  const activeCriteria = criteria.filter((criterion) => !criterion.archived);
  const questionCount = (criterionId: string) =>
    questions.filter((question) => question.criterionIds.includes(criterionId))
      .length;
  const sortedCriteria = [...activeCriteria].sort(
    (a, b) =>
      Number(b.priority === "must") - Number(a.priority === "must"),
  );
  const uncoveredCount = activeCriteria.filter(
    (criterion) => questionCount(criterion.id) === 0,
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="items-start gap-6 grid xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Outline */}
        <Card>
          <CardHeader>
            <CardTitle>Scaletta</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="gap-4 grid grid-cols-2 sm:grid-cols-4">
              <Stat value={`R${guide.round}`} label="round" />
              <Stat
                value={plannedMinutes}
                label={
                  minutesMismatch
                    ? `minuti nelle sezioni su ${guide.durationMinutes}`
                    : "minuti previsti"
                }
                tone={minutesMismatch ? "warning" : undefined}
              />
              <Stat value={questions.length} label="domande" />
              <Stat value={requiredCount} label="obbligatorie" />
            </div>

            {guide.sections.length === 0 ? (
              <p className="text-muted-foreground">Nessuna sezione.</p>
            ) : (
              <ol className="flex flex-col border-t">
                {guide.sections.map((section, index) => (
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
                        {section.questions.length}{" "}
                        {section.questions.length === 1
                          ? "domanda"
                          : "domande"}
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
          </CardContent>
        </Card>

        {/* Scorecard criteria coverage */}
        <Card size="sm">
          <CardHeader>
            <CardTitle>Criteri della scheda</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {sortedCriteria.length === 0 ? (
              <p className="text-muted-foreground">
                Nessun criterio nella scheda di valutazione.
              </p>
            ) : (
              <>
                {uncoveredCount > 0 && (
                  <p className="flex items-start gap-2 bg-warning/10 px-3 py-2 rounded-md text-warning">
                    <AlertTriangle
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden
                    />
                    <span>
                      {uncoveredCount === 1
                        ? "1 criterio senza domande"
                        : `${uncoveredCount} criteri senza domande`}
                    </span>
                  </p>
                )}
                <ul className="flex flex-col">
                  {sortedCriteria.map((criterion) => {
                    const count = questionCount(criterion.id);
                    const priority =
                      CRITERION_PRIORITY_PRESENTATION[criterion.priority];
                    return (
                      <li
                        key={criterion.id}
                        className="flex justify-between items-center gap-2 py-2 border-b last:border-b-0"
                      >
                        <span className="flex flex-col gap-1 min-w-0">
                          <span className="font-medium">{criterion.name}</span>
                          <Badge className={cn("w-fit", priority.className)}>
                            {priority.label}
                          </Badge>
                        </span>
                        <span
                          className={cn(
                            "text-xs tabular-nums shrink-0",
                            count === 0
                              ? "text-warning font-semibold"
                              : "text-muted-foreground",
                          )}
                        >
                          {count === 0
                            ? "Nessuna domanda"
                            : `${count} ${count === 1 ? "domanda" : "domande"}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Questions, one chapter per section */}
      {guide.sections.map((section, sectionIndex) => (
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
              {section.questions.length}{" "}
              {section.questions.length === 1 ? "domanda" : "domande"}
            </span>
          </header>

          {section.questions.length === 0 && (
            <p className="py-2 text-muted-foreground text-sm">
              Nessuna domanda in questa sezione.
            </p>
          )}

          {section.questions.map((question, index) => (
            <Card
              key={question.id}
              className={cn(question.required && "ring-primary/40")}
            >
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 font-display font-bold text-muted-foreground text-sm tabular-nums">
                    {sectionIndex + 1}.{index + 1}
                  </span>
                  <div className="flex flex-col flex-1 gap-2 min-w-0">
                    <p className="font-semibold text-foreground text-base leading-snug">
                      {question.text || "Domanda senza testo"}
                    </p>
                    {question.required && (
                      <div>
                        <Badge>Obbligatoria</Badge>
                      </div>
                    )}
                  </div>
                </div>

                {question.followUps.length > 0 && (
                  <FollowUpList followUps={question.followUps} />
                )}

                {hasAnchors(question.anchors) && (
                  <AnswerAnchors anchors={question.anchors} />
                )}

                {question.criterionIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                    <BlockLabel>Criteri</BlockLabel>
                    {question.criterionIds.map((criterionId) => (
                      <Badge key={criterionId} variant="secondary">
                        {criterionLabel(criterionId)}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
