import type {
  HireRecommendation,
  InterviewMissingSource,
  InterviewParticipantRole,
  InterviewStatus,
  KitChecklistCategory,
  KitItemOrigin,
  KitStatus,
} from "@/lib/schemas";

/**
 * Italian labels and tints of interviews, kits, kit items, participants and
 * interviewer scorecards, in one place. Only project colour tokens.
 */

type StatusPresentation = { label: string; badge: string; dot: string };

export const INTERVIEW_STATUS_PRESENTATION: Record<
  InterviewStatus,
  StatusPresentation
> = {
  scheduled: {
    label: "Pianificato",
    badge: "bg-stage-pending/10 text-stage-pending",
    dot: "bg-stage-pending",
  },
  in_progress: {
    label: "In corso",
    badge: "bg-stage-progress/10 text-stage-progress",
    dot: "bg-stage-progress",
  },
  completed: {
    label: "Concluso",
    badge: "bg-stage-done/10 text-stage-done",
    dot: "bg-stage-done",
  },
  cancelled: {
    label: "Annullato",
    badge: "bg-stage-cancelled/10 text-stage-cancelled",
    dot: "bg-stage-cancelled",
  },
  no_show: {
    label: "Non presentato",
    badge: "bg-stage-expired/10 text-stage-expired",
    dot: "bg-stage-expired",
  },
};

/** Presentation of an interview status; an unknown status falls back to muted */
export function getInterviewStatusPresentation(
  status: string,
): StatusPresentation {
  return (
    INTERVIEW_STATUS_PRESENTATION[status as InterviewStatus] ?? {
      label: status,
      badge: "bg-muted text-muted-foreground",
      dot: "bg-muted-foreground",
    }
  );
}

export const KIT_STATUS_PRESENTATION: Record<
  KitStatus,
  { label: string; badge: string }
> = {
  draft: { label: "Preparazione in bozza", badge: "bg-warning/10 text-warning" },
  ready: { label: "Preparazione pronta", badge: "bg-success/10 text-success" },
};

/** Badge text; previous_round shows 'Round {n}' where n = the round of the cited feedback, or 'Round precedente'. */
export const KIT_ITEM_ORIGIN_LABEL: Record<KitItemOrigin, string> = {
  template: "Modello",
  cv: "CV",
  resume_gap: "Lacuna CV",
  quiz_answer: "Test",
  previous_round: "Round precedente",
  manual: "Manuale",
};

/** Origin badge of a kit question: a previous-round question names its round when known */
export function getKitItemOriginLabel(
  origin: KitItemOrigin,
  sourceRound: number | null = null,
): string {
  if (origin === "previous_round" && sourceRound !== null) {
    return `Round ${sourceRound}`;
  }
  return KIT_ITEM_ORIGIN_LABEL[origin];
}

/** Checklist groups of a kit, in display order */
export const CHECKLIST_GROUPS: readonly { category: KitChecklistCategory; title: string }[] = [
  { category: "communicate", title: "Da comunicare" },
  { category: "logistics", title: "Logistica" },
];

export const PARTICIPANT_ROLE_LABEL: Record<InterviewParticipantRole, string> =
  {
    lead: "Conduttore",
    observer: "Osservatore",
  };

export const HIRE_RECOMMENDATION_LABEL: Record<HireRecommendation, string> = {
  strong_yes: "Assolutamente sì",
  yes: "Sì",
  maybe: "Forse",
  no: "No",
  strong_no: "Assolutamente no",
};

export const MISSING_SOURCE_LABEL: Record<InterviewMissingSource, string> = {
  cv: "CV",
  cv_evaluation: "Valutazione del CV",
  assessment: "Test",
  answer_detail: "Dettaglio risposte del test",
};

/** Fixed legal reminder of the preparation and live pages: never stored */
export const LEGAL_REMINDER_TEXT =
  "Non fare domande su età, stato civile, famiglia, figli o intenzione di averne, religione, opinioni politiche o sindacali, salute: sono vietate dall'art. 8 dello Statuto dei Lavoratori e dal D.Lgs. 198/2006 (Codice delle pari opportunità).";
