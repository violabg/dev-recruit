import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/interview-kits", () => ({ saveInterviewKit: vi.fn() }));

import prisma from "@/lib/prisma";
import type { Actor } from "@/lib/services/actor";
import {
  applyKitPatch,
  loadStoredKit,
  patchInterviewKit,
  type StoredKit,
} from "@/lib/services/interview-kit-patch";
import { saveInterviewKit } from "@/lib/services/interview-kits";

const actor: Actor = { userId: "u1", role: "user" };

const item = (id: string, sectionId: string, order: number, extra: Partial<StoredKit["items"][number]> = {}) => ({
  id,
  sectionId,
  text: `Domanda ${id}`,
  followUps: [],
  criterionIds: [],
  required: false,
  origin: "template" as const,
  rationale: null,
  sourceRef: null,
  order,
  ...extra,
});

const kit: StoredKit = {
  briefing: ["Punto"],
  hypotheses: [],
  checklist: [{ id: "c1", category: "logistics", text: "Link della call", done: true }],
  missingSources: ["cv"],
  sections: [
    { id: "s2", order: 1 },
    { id: "s1", order: 0 },
    { id: "s3", order: 2 },
  ],
  items: [
    item("b", "s2", 0),
    item("a2", "s1", 1, { origin: "cv", rationale: "Dal CV", required: true }),
    item("a1", "s1", 0),
  ],
};

const ids = (payload: ReturnType<typeof applyKitPatch>) =>
  payload.items.map((row) => row.id ?? `new:${row.text}`);

describe("applyKitPatch", () => {
  it("keeps every question it is not told to change, in section and item order", () => {
    const payload = applyKitPatch(kit, { interviewId: "int-1" });

    expect(ids(payload)).toEqual(["a1", "a2", "b"]);
    expect(payload.items[1]).toMatchObject({
      origin: "cv",
      rationale: "Dal CV",
      required: true,
    });
    expect(payload.briefing).toEqual(["Punto"]);
    expect(payload.checklist).toEqual(kit.checklist);
    expect(payload.missingSources).toEqual(["cv"]);
  });

  it("adds questions at the end of their section as manual questions", () => {
    const payload = applyKitPatch(kit, {
      interviewId: "int-1",
      addItems: [
        { sectionId: "s1", text: "Nuova in s1" },
        { sectionId: "s3", text: "Nuova in s3 vuota", required: true },
      ],
    });

    expect(ids(payload)).toEqual(["a1", "a2", "new:Nuova in s1", "b", "new:Nuova in s3 vuota"]);
    expect(payload.items[2]).toMatchObject({ origin: "manual", followUps: [], criterionIds: [] });
    expect(payload.items[4].required).toBe(true);
  });

  it("puts a question for an empty section before the later sections", () => {
    const withEmptyMiddle: StoredKit = {
      ...kit,
      items: [item("a1", "s1", 0), item("c", "s3", 0)],
    };
    const payload = applyKitPatch(withEmptyMiddle, {
      interviewId: "int-1",
      addItems: [{ sectionId: "s2", text: "Nuova in s2" }],
    });

    expect(ids(payload)).toEqual(["a1", "new:Nuova in s2", "c"]);
  });

  it("edits only the given fields and removes only the given questions", () => {
    const payload = applyKitPatch(kit, {
      interviewId: "int-1",
      updateItems: [{ id: "a2", text: "Testo nuovo" }],
      removeItemIds: ["b"],
    });

    expect(ids(payload)).toEqual(["a1", "a2"]);
    expect(payload.items[1]).toMatchObject({ text: "Testo nuovo", required: true, origin: "cv" });
  });

  it("replaces briefing and hypotheses only when given; adds and removes checklist entries", () => {
    const payload = applyKitPatch(
      kit,
      {
        interviewId: "int-1",
        briefing: ["Nuovo punto"],
        addChecklist: [{ category: "communicate", text: "Presentare il team" }],
        removeChecklistIds: ["c1"],
      },
      () => "new-id",
    );

    expect(payload.briefing).toEqual(["Nuovo punto"]);
    expect(payload.hypotheses).toEqual([]);
    expect(payload.checklist).toEqual([
      { id: "new-id", category: "communicate", text: "Presentare il team", done: false },
    ]);
  });

  it("refuses ids that are not in the kit, so nothing is edited or deleted by mistake", () => {
    expect(() => applyKitPatch(kit, { interviewId: "int-1", removeItemIds: ["x"] })).toThrow(
      "non appartengono a questa preparazione",
    );
    expect(() =>
      applyKitPatch(kit, { interviewId: "int-1", updateItems: [{ id: "x", text: "abc" }] }),
    ).toThrow("non appartengono a questa preparazione");
    expect(() =>
      applyKitPatch(kit, { interviewId: "int-1", removeChecklistIds: ["x"] }),
    ).toThrow("non appartengono a questa preparazione");
    expect(() =>
      applyKitPatch(kit, { interviewId: "int-1", addItems: [{ sectionId: "x", text: "abc" }] }),
    ).toThrow("Sezione della preparazione non valida");
  });

  it("refuses a question edited and removed at once", () => {
    expect(() =>
      applyKitPatch(kit, {
        interviewId: "int-1",
        updateItems: [{ id: "a1", text: "abc" }],
        removeItemIds: ["a1"],
      }),
    ).toThrow("modificata e rimossa insieme");
  });
});

describe("loadStoredKit and patchInterviewKit", () => {
  beforeEach(() => {
    vi.mocked(prisma.interviewKit.findUnique).mockResolvedValue({
      briefing: ["Punto", 3],
      hypotheses: [{ criterionId: "k1", hypothesis: "Ipotesi", howToVerify: "Chiedere" }, { bad: true }],
      checklist: [{ id: "c1", category: "logistics", text: "Link della call", done: false }],
      missingSources: ["cv", "unknown"],
      sections: [{ id: "s1", order: 0 }],
      items: [item("a1", "s1", 0)],
    } as any);
    vi.mocked(saveInterviewKit).mockResolvedValue({
      kitId: "kit-1",
      interviewId: "int-1",
      applicationId: "app-1",
    });
  });

  it("reads the stored kit fresh and drops values that no longer parse", async () => {
    const stored = await loadStoredKit("int-1");

    expect(prisma.interviewKit.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { interviewId: "int-1" } }),
    );
    expect(stored?.briefing).toEqual(["Punto"]);
    expect(stored?.hypotheses).toHaveLength(1);
    expect(stored?.missingSources).toEqual(["cv"]);
  });

  it("saves the patched kit through the editor path, refusing a ready kit", async () => {
    await patchInterviewKit(actor, {
      interviewId: "int-1",
      addItems: [{ sectionId: "s1", text: "Nuova domanda" }],
    });

    expect(saveInterviewKit).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({
        interviewId: "int-1",
        items: [
          expect.objectContaining({ id: "a1" }),
          expect.objectContaining({ text: "Nuova domanda", origin: "manual" }),
        ],
      }),
      { requireDraftStatus: true },
    );
  });

  it("refuses an interview without a kit", async () => {
    vi.mocked(prisma.interviewKit.findUnique).mockResolvedValueOnce(null);
    await expect(patchInterviewKit(actor, { interviewId: "nope" })).rejects.toThrow(
      "Colloquio non trovato",
    );
    expect(saveInterviewKit).not.toHaveBeenCalled();
  });
});
