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

  const currentIndex = items.findIndex((item) => item.id === selectedId);
  const current = currentIndex >= 0 ? items[currentIndex] : null;
  const currentNote = current ? noteValues(current.id) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={statusPresentation.badge}>
            {statusPresentation.label}
          </Badge>
          {isParticipant && (
            <span
              className={cn(
                "text-sm",
                autosaveStatus === "saved" && "text-muted-foreground",
                autosaveStatus === "saving" && "text-muted-foreground",
                autosaveStatus === "offline" && "text-warning",
                autosaveStatus === "error" && "text-destructive",
              )}
              aria-live="polite"
            >
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
              variant="outline"
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
              Compila scheda
            </Link>
          )}
        </div>
      </div>

      {session.viewerSubmitted && (
        <p className="bg-muted px-3 py-2 rounded-md text-muted-foreground text-sm">
          Hai già inviato la scheda: le tue note sono in sola lettura.
        </p>
      )}

      <div className="items-start gap-6 grid lg:grid-cols-[18rem_1fr_18rem]">
        {/* LEFT: sections with timers */}
        <div className="flex flex-col gap-4">
          {(kit?.sections ?? []).map((section) => (
            <Card key={section.id} size="sm">
              <CardHeader>
                <CardTitle className="flex justify-between items-center gap-2 text-sm">
                  <span>{section.title}</span>
                  <SectionTimer minutes={section.minutes} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1">
                  {items
                    .filter((item) => item.sectionId === section.id)
                    .map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={cn(
                            "flex items-start gap-2 hover:bg-muted px-2 py-1.5 rounded-md w-full text-sm text-left",
                            item.id === selectedId && "bg-muted font-medium",
                          )}
                        >
                          {isCovered(item) ? (
                            <Check
                              className="mt-0.5 size-4 text-success shrink-0"
                              aria-label="Coperta"
                            />
                          ) : (
                            <span className="size-4 shrink-0" aria-hidden />
                          )}
                          <span className="line-clamp-2">{item.text}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CENTRE: current question */}
        <div className="flex flex-col gap-4">
          {current && currentNote ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-start gap-2">
                  <span>{current.text}</span>
                  <Badge variant="outline">
                    {getKitItemOriginLabel(current.origin, current.sourceRound)}
                  </Badge>
                  {current.required && (
                    <Badge variant="outline">Obbligatoria</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {current.followUps.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm">Approfondimenti</span>
                    <ul className="pl-5 text-sm list-disc">
                      {current.followUps.map((followUp, index) => (
                        <li key={index}>{followUp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="gap-3 grid md:grid-cols-3">
                  {(
                    [
                      ["weak", "Risposta debole"],
                      ["medium", "Risposta media"],
                      ["strong", "Risposta forte"],
                    ] as const
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className="flex flex-col gap-1 bg-muted/40 p-3 border rounded-md"
                    >
                      <span className="font-medium text-xs">{label}</span>
                      <p className="text-muted-foreground text-sm">
                        {current.anchors[key] || "—"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="live-note">Nota rapida</Label>
                  <Textarea
                    id="live-note"
                    value={currentNote.note ?? ""}
                    disabled={!notesEditable}
                    className="min-h-24"
                    onChange={(event) =>
                      changeNote(current.id, {
                        note: event.target.value || null,
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="font-medium text-sm">Voto</span>
                  <div className="flex gap-2" role="group" aria-label="Voto da 1 a 5">
                    {SCORES.map((score) => (
                      <Button
                        key={score}
                        type="button"
                        size="sm"
                        variant={
                          currentNote.score === score ? "default" : "outline"
                        }
                        aria-pressed={currentNote.score === score}
                        disabled={!notesEditable}
                        onClick={() =>
                          changeNote(current.id, {
                            score: currentNote.score === score ? null : score,
                          })
                        }
                      >
                        {score}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="live-evidence">Citazione a supporto</Label>
                  <Input
                    id="live-evidence"
                    value={currentNote.evidenceQuote ?? ""}
                    disabled={!notesEditable}
                    onChange={(event) =>
                      changeNote(current.id, {
                        evidenceQuote: event.target.value || null,
                      })
                    }
                  />
                </div>

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
              Il kit non ha domande.
            </p>
          )}
        </div>

        {/* RIGHT: criteria coverage */}
        <CriteriaCoveragePanel coverage={coverage} />
      </div>

      <AlertDialog open={confirmComplete} onOpenChange={setConfirmComplete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concludere il colloquio?</AlertDialogTitle>
            <AlertDialogDescription>
              Dopo la conclusione le note non si possono più modificare: ogni
              partecipante compila la propria scheda.
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
