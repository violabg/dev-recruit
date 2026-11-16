import type { InterviewKitProposal } from "@/lib/schemas";
import { mergeKitProposal, type KitFormValues } from "@/lib/utils/kit-proposal";
import { describe, expect, it } from "vitest";

const anchors = { weak: "", medium: "", strong: "" };

const item = (
  id: string | undefined,
  sectionId: string,
  origin: KitFormValues["items"][number]["origin"],
  edited = false,
) => ({
  id,
  sectionId,
  text: `Domanda ${id ?? "nuova"}`,
  followUps: [],
  criterionIds: [],
  required: false,
  origin,
  edited,
});

const values: KitFormValues = {
  briefing: ["Vecchio punto"],
  hypotheses: [{ criterionId: "c1", hypothesis: "Vecchia", howToVerify: "Vecchio" }],
  checklist: [
    { id: "k1", category: "communicate", text: "RAL e benefit", done: true },
  ],
  missingSources: ["cv"],
  items: [
    item("t1", "s-intro", "template"),
    item("ai-old", "s-tech", "cv"),
    item("t2", "s-tech", "template"),
    item("ai-edited", "s-tech", "quiz_answer", true),
    item("m1", "s-tech", "manual"),
    item("ai-old-2", "s-close", "previous_round"),
  ],
};

const proposal: InterviewKitProposal = {
  briefing: ["Punto 1", "Punto 2"],
  hypotheses: [{ criterionId: "c2", hypothesis: "Nuova", howToVerify: "Chiedi" }],
  items: [
    {
      sectionId: "s-tech",
      text: "Nuova tecnica",
      followUps: ["Perché?"],
      criterionIds: ["c2"],
      anchors,
      required: false,
      origin: "cv",
      rationale: "Dal CV",
      sourceRef: "cv:React",
    },
    {
      sectionId: "s-other",
      text: "Nuova altra sezione",
      followUps: [],
      criterionIds: [],
      anchors,
      required: false,
      origin: "resume_gap",
      rationale: "Lacuna",
      sourceRef: null,
    },
  ],
  suggestedChecklist: [
    { category: "communicate", text: "  ral E BENEFIT " },
    { category: "logistics", text: "Inviare il link" },
    { category: "logistics", text: "inviare il link" },
  ],
  missingSources: ["assessment"],
};

describe("mergeKitProposal", () => {
  const merged = mergeKitProposal(values, proposal, () => "new-id");

  it("keeps template, manual and edited AI items in place and drops the non-edited AI ones", () => {
    expect(merged.items.map((row) => row.id ?? row.text)).toEqual([
      "t1",
      "t2",
      "ai-edited",
      "m1",
      "Nuova tecnica",
      "Nuova altra sezione",
    ]);
    expect(merged.items.some((row) => row.id === "ai-old")).toBe(false);
    expect(merged.items.some((row) => row.id === "ai-old-2")).toBe(false);
  });

  it("appends the proposal items at the end of their section, without id and not edited", () => {
    const added = merged.items.find((row) => row.text === "Nuova tecnica");
    expect(added?.id).toBeUndefined();
    expect(added).toMatchObject({
      sectionId: "s-tech",
      origin: "cv",
      rationale: "Dal CV",
      sourceRef: "cv:React",
      edited: false,
    });
  });

  it("replaces briefing, hypotheses and missing sources", () => {
    expect(merged.briefing).toEqual(["Punto 1", "Punto 2"]);
    expect(merged.hypotheses).toEqual(proposal.hypotheses);
    expect(merged.missingSources).toEqual(["assessment"]);
  });

  it("appends only checklist suggestions whose trimmed lower-case text is new", () => {
    expect(merged.checklist).toEqual([
      { id: "k1", category: "communicate", text: "RAL e benefit", done: true },
      { id: "new-id", category: "logistics", text: "Inviare il link", done: false },
    ]);
  });

  it("does not modify the input values", () => {
    expect(values.items).toHaveLength(6);
    expect(values.checklist).toHaveLength(1);
  });
});
