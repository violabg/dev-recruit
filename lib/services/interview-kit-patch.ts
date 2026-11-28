/**
 * Interview kit patch
 *
 * Changes to a kit described one by one (add, edit or remove questions,
 * replace briefing and hypotheses, add or remove checklist entries), applied
 * to the stored kit and saved through `saveInterviewKit`, the editor's save
 * path. Questions the patch does not mention stay as they are: a client never
 * has to resend the whole kit, so it cannot drop questions by omission.
 * Domain logic only: no Next.js import and no cache call.
 */

import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import {
  INTERVIEW_MISSING_SOURCE_VALUES,
  kitChecklistItemSchema,
  kitHypothesisSchema,
  type KitChecklistItem,
  type KitHypothesis,
  type KitItemInput,
  type SaveInterviewKitInput,
} from "@/lib/schemas";
import type { Actor } from "./actor";
import { saveInterviewKit } from "./interview-kits";
import { UserError } from "./user-error";

export interface KitPatch {
  interviewId: string;
  /** Replaces the briefing when given */
  briefing?: string[];
  /** Replaces the hypotheses when given */
  hypotheses?: KitHypothesis[];
  /** New questions, appended at the end of their section in the given order */
  addItems?: {
    sectionId: string;
    text: string;
    followUps?: string[];
    criterionIds?: string[];
    required?: boolean;
    rationale?: string | null;
  }[];
  /** Changes to stored questions; fields left out are kept */
  updateItems?: {
    id: string;
    text?: string;
    followUps?: string[];
    criterionIds?: string[];
    required?: boolean;
  }[];
  removeItemIds?: string[];
  addChecklist?: { category: KitChecklistItem["category"]; text: string }[];
  removeChecklistIds?: string[];
}

/** The stored kit as the patch needs it. Anchors are not carried: a saved
 * question without anchors keeps the stored ones. */
export interface StoredKit {
  briefing: string[];
  hypotheses: KitHypothesis[];
  checklist: KitChecklistItem[];
  missingSources: SaveInterviewKitInput["missingSources"];
  sections: { id: string; order: number }[];
  items: {
    id: string;
    sectionId: string;
    text: string;
    followUps: string[];
    criterionIds: string[];
    required: boolean;
    origin: NonNullable<KitItemInput["origin"]>;
    rationale: string | null;
    sourceRef: string | null;
    order: number;
  }[];
}

const unknownIds = (ids: string[], known: Set<string>) =>
  ids.filter((id) => !known.has(id));

/**
 * The full editor payload of the kit after the patch. Refuses ids that are
 * not in the kit, so a stale or invented id never deletes or edits anything.
 */
export function applyKitPatch(
  kit: StoredKit,
  patch: KitPatch,
  newId: () => string = randomUUID,
): SaveInterviewKitInput {
  const itemIds = new Set(kit.items.map((item) => item.id));
  const sectionIds = new Set(kit.sections.map((section) => section.id));
  const checklistIds = new Set(kit.checklist.map((row) => row.id));

  const removed = new Set(patch.removeItemIds ?? []);
  const updates = new Map((patch.updateItems ?? []).map((update) => [update.id, update]));

  if (
    unknownIds([...removed, ...updates.keys()], itemIds).length ||
    unknownIds(patch.removeChecklistIds ?? [], checklistIds).length
  ) {
    throw new UserError("Una o più voci non appartengono a questa preparazione: rileggila");
  }
  if (unknownIds((patch.addItems ?? []).map((item) => item.sectionId), sectionIds).length) {
    throw new UserError("Sezione della preparazione non valida");
  }
  if ([...updates.keys()].some((id) => removed.has(id))) {
    throw new UserError("Una domanda non può essere modificata e rimossa insieme");
  }

  const sectionOrder = new Map(kit.sections.map((section) => [section.id, section.order]));
  const ordered = [...kit.items].sort(
    (a, b) =>
      (sectionOrder.get(a.sectionId) ?? 0) - (sectionOrder.get(b.sectionId) ?? 0) ||
      a.order - b.order,
  );

  const kept: KitItemInput[] = ordered
    .filter((item) => !removed.has(item.id))
    .map((item) => {
      const update = updates.get(item.id);
      return {
        id: item.id,
        sectionId: item.sectionId,
        text: update?.text ?? item.text,
        followUps: update?.followUps ?? item.followUps,
        criterionIds: update?.criterionIds ?? item.criterionIds,
        required: update?.required ?? item.required,
        origin: item.origin,
        rationale: item.rationale ?? null,
        sourceRef: item.sourceRef ?? null,
      };
    });

  // New questions go after the last kept question of their section
  const items = [...kept];
  for (const added of patch.addItems ?? []) {
    const input: KitItemInput = {
      sectionId: added.sectionId,
      text: added.text,
      followUps: added.followUps ?? [],
      criterionIds: added.criterionIds ?? [],
      required: added.required ?? false,
      // Written by the assistant and saved by a person: a manual question,
      // which the in-app regeneration keeps
      origin: "manual",
      rationale: added.rationale ?? null,
      sourceRef: null,
    };
    let at = -1;
    items.forEach((item, index) => {
      if (item.sectionId === added.sectionId) at = index;
    });
    if (at === -1) {
      // Empty section: before the first question of a later section
      const order = sectionOrder.get(added.sectionId) ?? 0;
      const next = items.findIndex((item) => (sectionOrder.get(item.sectionId) ?? 0) > order);
      items.splice(next === -1 ? items.length : next, 0, input);
    } else {
      items.splice(at + 1, 0, input);
    }
  }

  const removedChecklist = new Set(patch.removeChecklistIds ?? []);
  const checklist: KitChecklistItem[] = [
    ...kit.checklist.filter((row) => !removedChecklist.has(row.id)),
    ...(patch.addChecklist ?? []).map((row) => ({
      id: newId(),
      category: row.category,
      text: row.text,
      done: false,
    })),
  ];

  return {
    interviewId: patch.interviewId,
    briefing: patch.briefing ?? kit.briefing,
    hypotheses: patch.hypotheses ?? kit.hypotheses,
    checklist,
    items,
    missingSources: kit.missingSources,
  };
}

/** Elements of a stored JSON list that pass the schema */
function parseList<T>(value: unknown, parse: (element: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((element) => {
    const parsed = parse(element);
    return parsed === null ? [] : [parsed];
  });
}

const MISSING_SOURCES = new Set<string>(INTERVIEW_MISSING_SOURCE_VALUES);

/** The stored kit of an interview, read fresh (not cached); null without one */
export async function loadStoredKit(interviewId: string): Promise<StoredKit | null> {
  const kit = await prisma.interviewKit.findUnique({
    where: { interviewId },
    select: {
      briefing: true,
      hypotheses: true,
      checklist: true,
      missingSources: true,
      sections: { select: { id: true, order: true } },
      items: {
        select: {
          id: true,
          sectionId: true,
          text: true,
          followUps: true,
          criterionIds: true,
          required: true,
          origin: true,
          rationale: true,
          sourceRef: true,
          order: true,
        },
      },
    },
  });
  if (!kit) return null;

  return {
    briefing: parseList(kit.briefing, (element) =>
      typeof element === "string" ? element : null,
    ),
    hypotheses: parseList(kit.hypotheses, (element) => {
      const result = kitHypothesisSchema.safeParse(element);
      return result.success ? result.data : null;
    }),
    checklist: parseList(kit.checklist, (element) => {
      const result = kitChecklistItemSchema.safeParse(element);
      return result.success ? result.data : null;
    }),
    missingSources: kit.missingSources.filter((source) =>
      MISSING_SOURCES.has(source),
    ) as SaveInterviewKitInput["missingSources"],
    sections: kit.sections,
    items: kit.items as StoredKit["items"],
  };
}

/**
 * Applies the patch to the stored kit and saves it while the kit is a draft
 * (a ready kit is refused) and the interview is scheduled.
 */
export async function patchInterviewKit(
  actor: Actor,
  patch: KitPatch,
): Promise<{ kitId: string; interviewId: string; applicationId: string }> {
  const kit = await loadStoredKit(patch.interviewId);
  if (!kit) throw new UserError("Colloquio non trovato");

  const payload = applyKitPatch(kit, patch);
  return saveInterviewKit(actor, payload, { requireDraftStatus: true });
}
