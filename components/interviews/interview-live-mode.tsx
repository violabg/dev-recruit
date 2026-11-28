"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type LiveNoteDraft,
  useLiveNotesAutosave,
} from "@/hooks/use-live-notes-autosave";
import {
  completeInterviewAction,
  startInterviewAction,
} from "@/lib/actions/interviews";
import { setKitItemCoveredAction } from "@/lib/actions/interview-kits";
import type { InterviewLiveSession } from "@/lib/data/interviews";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { computeCriterionCoverage } from "@/lib/utils/interview-feedback";
import { cn } from "cn";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flag,
  Loader2,
  NotebookPen,
  Play,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CriteriaCoveragePanel } from "./criteria-coverage-panel";
import {
  AnswerAnchors,
  BlockLabel,
  FollowUpList,
  hasAnchors,
} from "./kit-blocks";
import {
  getInterviewStatusPresentation,
  getKitItemOriginLabel,
} from "./interview-presentation";
import { SectionTimer } from "./section-timer";

/** Shared covered marks are refreshed this often while the interview runs */
const REFRESH_MS = 15_000;
const SCORES = [1, 2, 3, 4, 5] as const;

const AUTOSAVE_TEXT = {
  saved: "Salvato",
  saving: "Salvataggio…",
  offline: "Non salvato - offline",
  error: "Errore di salvataggio",
} as const;

type NoteValues = {
  note: string | null;
  score: number | null;
  evidenceQuote: string | null;
};

/**
 * Live mode of an interview: sections with timers on the left, the current
 * question with its anchors and the own note in the centre, the criteria
 * coverage on the right. Notes autosave and survive a lost connection.
 */
export function InterviewLiveMode({
  session,
  userId,
}: {
  session: InterviewLiveSession;
  userId: string;
}) {
  const router = useRouter();
  const [isChangingStatus, startStatusChange] = useTransition();
  const [confirmComplete, setConfirmComplete] = useState(false);
  const kit = session.kit;
  const items = useMemo(() => kit?.items ?? [], [kit]);

  const [selectedId, setSelectedId] = useState<string | null>(
    items[0]?.id ?? null,
  );
  // Local edits of the own notes and optimistic covered marks
  const [edits, setEdits] = useState<Record<string, LiveNoteDraft>>({});
  const [coveredOverrides, setCoveredOverrides] = useState<
    Record<string, boolean>
  >({});

  const { queueChange, status: autosaveStatus, restoredDrafts } =
    useLiveNotesAutosave({ interviewId: session.id, userId });

  const isParticipant = session.viewerParticipantId !== null;
  const isOpen =
    session.status === "scheduled" || session.status === "in_progress";
  const notesEditable = isParticipant && !session.viewerSubmitted && isOpen;
  const statusPresentation = getInterviewStatusPresentation(session.status);

  // Shared covered marks of the other participants
  useEffect(() => {
    if (session.status !== "in_progress") return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [session.status, router]);

  const serverNotes = useMemo(
    () => new Map(session.ownNotes.map((note) => [note.kitItemId, note])),
    [session.ownNotes],
  );

  /** Shown value of the own note: local edit, then restored draft, then server */
  function noteValues(kitItemId: string): NoteValues {
    const server = serverNotes.get(kitItemId);
    const restored = restoredDrafts[kitItemId] ?? {};
    const edit = edits[kitItemId] ?? {};
    const pick = <K extends keyof NoteValues>(key: K): NoteValues[K] => {
      if (edit[key] !== undefined) return edit[key] as NoteValues[K];
      if (restored[key] !== undefined) return restored[key] as NoteValues[K];
      return (server?.[key] ?? null) as NoteValues[K];
    };
    return {
      note: pick("note"),
      score: pick("score"),
      evidenceQuote: pick("evidenceQuote"),
    };
  }

  function changeNote(kitItemId: string, change: LiveNoteDraft) {
    setEdits((current) => ({
      ...current,
      [kitItemId]: { ...current[kitItemId], ...change },
    }));
    queueChange(kitItemId, change);
  }

  const isCovered = (item: (typeof items)[number]) =>
    coveredOverrides[item.id] ?? item.covered;

  function toggleCovered(kitItemId: string, covered: boolean) {
    setCoveredOverrides((current) => ({ ...current, [kitItemId]: covered }));
    void (async () => {
      try {
        unwrap(await setKitItemCoveredAction({ kitItemId, covered }));
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        setCoveredOverrides((current) => {
          const next = { ...current };
          delete next[kitItemId];
          return next;
        });
        router.refresh();
      }
    })();
  }

  function start() {
    startStatusChange(async () => {
      try {
        unwrap(await startInterviewAction({ interviewId: session.id }));
        toast.success("Colloquio avviato");
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function complete() {
    startStatusChange(async () => {
      try {
        unwrap(await completeInterviewAction({ interviewId: session.id }));
        toast.success("Colloquio concluso");
        setConfirmComplete(false);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  const coverage = computeCriterionCoverage(
    session.criteria,
    items.map((item) => ({
      id: item.id,
      criterionIds: item.criterionIds,
      covered: isCovered(item),
      ownScore: noteValues(item.id).score,
    })),
  );

  const sections = (kit?.sections ?? []).map((section, sectionIndex) => ({
    section,
    sectionIndex,
    items: items.filter((item) => item.sectionId === section.id),
  }));
  /** "2.3": section number and position of the question in its section */
  const itemNumber = new Map<string, string>();
  const itemSection = new Map<string, (typeof sections)[number]["section"]>();
  for (const { section, sectionIndex, items: sectionItems } of sections) {
    sectionItems.forEach((item, index) => {
      itemNumber.set(item.id, `${sectionIndex + 1}.${index + 1}`);
      itemSection.set(item.id, section);
    });
  }

  const currentIndex = items.findIndex((item) => item.id === selectedId);
  const current = currentIndex >= 0 ? items[currentIndex] : null;
  const currentNote = current ? noteValues(current.id) : null;
  const currentSection = current ? itemSection.get(current.id) : undefined;
  const coveredCount = items.filter((item) => isCovered(item)).length;
  const progress = items.length > 0 ? (coveredCount / items.length) * 100 : 0;

  const criterionName = (id: string) => {
    const criterion = session.criteria.find((entry) => entry.id === id);
    return criterion?.name ?? "Criterio archiviato";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Status bar: state, progress, autosave, start/complete */}
      <Card size="sm">
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Badge className={statusPresentation.badge}>
                {statusPresentation.label}
              </Badge>
              <span className="text-sm">
                <span className="font-semibold tabular-nums">
                  {coveredCount}/{items.length}
                </span>{" "}
                <span className="text-muted-foreground">domande coperte</span>
              </span>
              {isParticipant && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs",
                    (autosaveStatus === "saved" ||
                      autosaveStatus === "saving") &&
                      "text-muted-foreground",
                    autosaveStatus === "offline" && "text-warning",
                    autosaveStatus === "error" && "text-destructive",
                  )}
                  aria-live="polite"
                >
                  {autosaveStatus === "saving" ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                  ) : autosaveStatus === "saved" ? (
                    <Check className="size-3" aria-hidden />
                  ) : null}
                  {AUTOSAVE_TEXT[autosaveStatus]}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {session.status === "scheduled" && isParticipant && (
                <Button
                  type="button"
                  size="sm"
                  disabled={isChangingStatus}
                  onClick={start}
                >
                  {isChangingStatus ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  Avvia colloquio
                </Button>
              )}
              {session.status === "in_progress" && (
                <Button
                  type="button"
                  size="sm"
                  disabled={isChangingStatus}
                  onClick={() => setConfirmComplete(true)}
                >
                  <Flag className="size-4" />
                  Concludi colloquio
                </Button>
              )}
              {session.status === "completed" && (
                <Link
                  href={
                    `/dashboard/applications/${session.applicationId}/interviews/${session.id}/feedback` as never
                  }
                  className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
                >
                  <NotebookPen className="size-4" />
                  Scrivi il feedback
                </Link>
              )}
            </div>
          </div>
          <div
            className="bg-muted rounded-full h-1.5 overflow-hidden"
            role="progressbar"
            aria-label="Domande coperte"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={coveredCount}
          >
            <div
              className="bg-success h-full transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {session.viewerSubmitted && (
        <p className="bg-muted px-3 py-2 rounded-md text-muted-foreground text-sm">
          Hai già inviato il feedback: le tue note sono in sola lettura.
        </p>
      )}

      <div className="items-start gap-6 grid xl:grid-cols-[17rem_minmax(0,1fr)] 2xl:grid-cols-[17rem_minmax(0,1fr)_17rem]">
        {/* CENTRE: current question (first on narrow screens) */}
        <div className="flex flex-col gap-4 xl:col-start-2 xl:row-start-1 min-w-0">
          {current && currentNote ? (
            <Card className={cn(current.required && "ring-primary/40")}>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                    <span className="font-display font-bold text-primary text-sm tabular-nums">
                      {itemNumber.get(current.id)}
                    </span>
                    {currentSection && (
                      <span className="font-medium">
                        {currentSection.title}
                      </span>
                    )}
                    <span aria-hidden>·</span>
                    <span>
                      Domanda {currentIndex + 1} di {items.length}
                    </span>
                  </div>
                  <h2 className="font-semibold text-foreground text-xl leading-snug">
                    {current.text}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {current.required && <Badge>Obbligatoria</Badge>}
                    <Badge variant="outline">
                      {getKitItemOriginLabel(current.origin, current.sourceRound)}
                    </Badge>
                    {current.criterionIds.map((criterionId) => (
                      <Badge key={criterionId} variant="secondary">
                        {criterionName(criterionId)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {current.rationale && (
                  <p className="bg-muted/60 px-3 py-2 rounded-md text-muted-foreground text-sm">
                    <span className="font-medium text-foreground">
                      Perché:{" "}
                    </span>
                    {current.rationale}
                  </p>
                )}

                {current.followUps.length > 0 && (
                  <FollowUpList followUps={current.followUps} />
                )}

                {hasAnchors(current.anchors) && (
                  <AnswerAnchors anchors={current.anchors} />
                )}

                {/* Own notes: a separate, tinted area */}
                <div className="flex flex-col gap-4 bg-muted/40 -mx-5 px-5 py-4 border-y">
                  <div className="flex justify-between items-center gap-3">
                    <BlockLabel>Le tue note</BlockLabel>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="live-covered"
                        checked={isCovered(current)}
                        disabled={!isOpen}
                        onCheckedChange={(checked) =>
                          toggleCovered(current.id, Boolean(checked))
                        }
                      />
                      <Label htmlFor="live-covered">Coperta</Label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="live-note">Nota rapida</Label>
                    <Textarea
                      id="live-note"
                      value={currentNote.note ?? ""}
                      disabled={!notesEditable}
                      className="bg-card min-h-24"
                      onChange={(event) =>
                        changeNote(current.id, {
                          note: event.target.value || null,
                        })
                      }
                    />
                  </div>

                  <div className="gap-4 grid md:grid-cols-[auto_minmax(0,1fr)]">
                    <div className="flex flex-col gap-2">
                      <span className="font-medium text-sm">Voto</span>
                      <div
                        className="flex gap-1.5"
                        role="group"
                        aria-label="Voto da 1 a 5"
                      >
                        {SCORES.map((score) => (
                          <Button
                            key={score}
                            type="button"
                            size="sm"
                            className="w-9"
                            variant={
                              currentNote.score === score
                                ? "default"
                                : "outline"
                            }
                            aria-pressed={currentNote.score === score}
                            disabled={!notesEditable}
                            onClick={() =>
                              changeNote(current.id, {
                                score:
                                  currentNote.score === score ? null : score,
                              })
                            }
                          >
                            {score}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-0">
                      <Label htmlFor="live-evidence">Citazione a supporto</Label>
                      <Input
                        id="live-evidence"
                        value={currentNote.evidenceQuote ?? ""}
                        disabled={!notesEditable}
                        className="bg-card"
                        onChange={(event) =>
                          changeNote(current.id, {
                            evidenceQuote: event.target.value || null,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentIndex <= 0}
                    onClick={() => setSelectedId(items[currentIndex - 1].id)}
                  >
                    <ArrowLeft className="size-4" />
                    Precedente
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentIndex >= items.length - 1}
                    onClick={() => setSelectedId(items[currentIndex + 1].id)}
                  >
                    Successiva
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground text-sm">
              La preparazione non ha domande.
            </p>
          )}
        </div>

        {/* LEFT: outline with section timers; coverage below it until 2xl */}
        <div className="flex flex-col gap-4 xl:col-start-1 xl:row-start-1">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Scaletta</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {sections.map(({ section, sectionIndex, items: sectionItems }) => (
                <div key={section.id} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center gap-3 pb-1 border-b">
                    <span className="flex items-baseline gap-2 min-w-0">
                      <span className="font-display font-bold text-primary text-xs tabular-nums">
                        {String(sectionIndex + 1).padStart(2, "0")}
                      </span>
                      <span className="font-semibold text-sm leading-snug">
                        {section.title}
                      </span>
                    </span>
                    <SectionTimer minutes={section.minutes} />
                  </div>
                  <ul className="flex flex-col">
                    {sectionItems.map((item) => {
                      const selected = item.id === selectedId;
                      const covered = isCovered(item);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(item.id)}
                            aria-current={selected ? "true" : undefined}
                            className={cn(
                              "flex items-start gap-2 hover:bg-muted px-2 py-1.5 border-l-2 border-transparent rounded-r-md w-full text-sm text-left transition-colors",
                              selected &&
                                "border-primary bg-primary/10 hover:bg-primary/10 font-medium text-foreground",
                              !selected && covered && "text-muted-foreground",
                            )}
                          >
                            <span className="mt-px w-7 shrink-0 text-muted-foreground text-xs tabular-nums">
                              {itemNumber.get(item.id)}
                            </span>
                            <span className="flex-1 line-clamp-2">
                              {item.text}
                            </span>
                            {covered ? (
                              <Check
                                className="mt-0.5 size-4 text-success shrink-0"
                                aria-label="Coperta"
                              />
                            ) : item.required ? (
                              <span
                                className="bg-primary mt-1.5 mr-1 rounded-full size-2 shrink-0"
                                aria-label="Obbligatoria"
                              />
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="2xl:hidden">
            <CriteriaCoveragePanel coverage={coverage} />
          </div>
        </div>

        {/* RIGHT (2xl only): criteria coverage */}
        <div className="hidden 2xl:block 2xl:col-start-3 2xl:row-start-1">
          <CriteriaCoveragePanel coverage={coverage} />
        </div>
      </div>

      <AlertDialog open={confirmComplete} onOpenChange={setConfirmComplete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concludere il colloquio?</AlertDialogTitle>
            <AlertDialogDescription>
              Dopo la conclusione le note non si possono più modificare: ogni
              partecipante scrive il proprio feedback.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingStatus}>
              Indietro
            </AlertDialogCancel>
            <AlertDialogAction onClick={complete} disabled={isChangingStatus}>
              {isChangingStatus && <Loader2 className="size-4 animate-spin" />}
              Concludi colloquio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
