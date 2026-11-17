import {
  AI_KIT_ITEM_ORIGIN_VALUES,
  type InterviewKitEditorData,
  type InterviewKitProposal,
  type KitItemInput,
} from "@/lib/schemas";

/**
 * Merge of an AI kit proposal into the preparation form values. Pure and
 * client-safe: nothing is saved until "Salva kit".
 */

export type KitFormItem = KitItemInput & { edited?: boolean };
export type KitFormValues = Omit<InterviewKitEditorData, "items"> & {
  items: KitFormItem[];
};

const isAiOrigin = (origin: string | undefined) =>
  (AI_KIT_ITEM_ORIGIN_VALUES as readonly (string | undefined)[]).includes(
    origin,
  );

const normalize = (text: string) => text.trim().toLowerCase();

/**
 * Template, manual and edited AI items stay untouched and in place; AI items
 * not edited are replaced by the proposal items, appended at the end of
 * their section. Briefing and hypotheses are replaced, checklist suggestions
 * are appended when their text is new, missing sources are replaced.
 */
export function mergeKitProposal(
  values: KitFormValues,
  proposal: InterviewKitProposal,
  newId: () => string,
): KitFormValues {
  const kept = values.items.filter(
    (item) => !isAiOrigin(item.origin) || item.edited === true,
  );

  // Sections in their order of appearance in the form, then the new ones
  const sectionOrder: string[] = [];
  for (const item of [...values.items, ...proposal.items]) {
    if (!sectionOrder.includes(item.sectionId)) {
      sectionOrder.push(item.sectionId);
    }
  }

  const proposed: KitFormItem[] = proposal.items.map((item) => ({
    sectionId: item.sectionId,
    text: item.text,
    followUps: item.followUps,
    criterionIds: item.criterionIds,
    anchors: item.anchors,
    required: item.required,
    origin: item.origin,
    rationale: item.rationale,
    sourceRef: item.sourceRef,
    edited: false,
  }));

  const items = sectionOrder.flatMap((sectionId) => [
    ...kept.filter((item) => item.sectionId === sectionId),
    ...proposed.filter((item) => item.sectionId === sectionId),
  ]);

  const existingTexts = new Set(
    values.checklist.map((entry) => normalize(entry.text)),
  );
  const checklist = [...values.checklist];
  for (const suggestion of proposal.suggestedChecklist) {
    const key = normalize(suggestion.text);
    if (!key || existingTexts.has(key)) continue;
    existingTexts.add(key);
    checklist.push({
      id: newId(),
      category: suggestion.category,
      text: suggestion.text,
      done: false,
    });
  }

  return {
    ...values,
    briefing: proposal.briefing,
    hypotheses: proposal.hypotheses,
    checklist,
    items,
    missingSources: proposal.missingSources,
  };
}
