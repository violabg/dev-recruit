import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    interview: { findUnique: vi.fn(), update: vi.fn() },
    interviewKit: { findUnique: vi.fn(), update: vi.fn() },
    kitItem: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    kitItemNote: { upsert: vi.fn() },
    interviewParticipant: { findUnique: vi.fn() },
    interviewerFeedback: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/services/interview-kits", () => ({
  buildKitGenerationContext: vi.fn(),
  cleanKitCriteria: vi.fn(),
  syncKitItems: vi.fn(),
}));

vi.mock("@/lib/services/ai/kit-generation", () => ({
  generateInterviewKit: vi.fn(),
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateInterviewCache: vi.fn(),
}));

import {
  generateInterviewKitAction,
  saveInterviewKitAction,
  saveKitItemNoteAction,
  setInterviewKitStatusAction,
  setKitItemCoveredAction,
} from "@/lib/actions/interview-kits";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { generateInterviewKit } from "@/lib/services/ai/kit-generation";
import {
  buildKitGenerationContext,
  cleanKitCriteria,
  syncKitItems,
} from "@/lib/services/interview-kits";
import { UserError } from "@/lib/services/user-error";
import { invalidateInterviewCache } from "@/lib/utils/cache-utils";

const db = prisma as any;
const LOCKED = "Il kit si modifica solo prima del colloquio";
const NOTES_CLOSED = "Il colloquio non accetta più note";

const interviewRow = (status: string) => ({
  id: "int-1",
  applicationId: "app-1",
  status,
  round: 1,
  application: { candidateId: "cand-1", positionId: "pos-1" },
});

const proposal = {
  briefing: ["Punto"],
  hypotheses: [],
  items: [],
  suggestedChecklist: [],
  missingSources: [],
};

const kitInput = {
  interviewId: "int-1",
  briefing: ["Punto"],
  hypotheses: [{ criterionId: "c1", hypothesis: "Ipotesi", howToVerify: "Chiedi" }],
  checklist: [{ id: "k1", category: "communicate" as const, text: "RAL e benefit", done: true }],
  items: [
    {
      sectionId: "s1",
      text: "Una domanda",
      followUps: [],
      criterionIds: [],
      required: false,
      origin: "manual" as const,
    },
  ],
  missingSources: ["cv" as const],
};

/** Every write delegate: generation must touch none */
const writes = () => [
  db.interview.update,
  db.interviewKit.update,
  db.kitItem.update,
  db.kitItem.create,
  db.kitItem.deleteMany,
  db.kitItemNote.upsert,
  prisma.$transaction,
];

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
  vi.mocked(prisma.$transaction).mockImplementation(((fn: any) => fn(prisma)) as any);
  db.interviewKit.findUnique.mockResolvedValue({ id: "kit-1" });
});

describe("generateInterviewKitAction", () => {
  it("returns the proposal and writes or invalidates nothing", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("scheduled"));
    vi.mocked(buildKitGenerationContext).mockResolvedValue({ marker: "ctx" } as any);
    vi.mocked(generateInterviewKit).mockResolvedValue(proposal as any);

    const result = await generateInterviewKitAction({
      interviewId: "int-1",
      specificModel: "some/model",
    });

    expect(result).toEqual({ success: true, proposal });
    expect(buildKitGenerationContext).toHaveBeenCalledWith("int-1");
    expect(generateInterviewKit).toHaveBeenCalledWith({
      context: { marker: "ctx" },
      specificModel: "some/model",
    });
    for (const write of writes()) {
      expect(write).not.toHaveBeenCalled();
    }
    expect(invalidateInterviewCache).not.toHaveBeenCalled();
  });

  it.each(["in_progress", "completed", "cancelled", "no_show"])(
    "is refused when the interview is %s",
    async (status) => {
      db.interview.findUnique.mockResolvedValue(interviewRow(status));
      expect(await generateInterviewKitAction({ interviewId: "int-1" })).toEqual({
        success: false,
        error: LOCKED,
      });
      expect(buildKitGenerationContext).not.toHaveBeenCalled();
    },
  );

  it("passes on the missing scorecard message", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("scheduled"));
    vi.mocked(buildKitGenerationContext).mockRejectedValue(
      new UserError("Crea prima la scheda di valutazione della posizione"),
    );
    expect(await generateInterviewKitAction({ interviewId: "int-1" })).toEqual({
      success: false,
      error: "Crea prima la scheda di valutazione della posizione",
    });
  });
});

describe("saveInterviewKitAction", () => {
  it("cleans the criteria, syncs the items and updates the kit in one transaction", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("scheduled"));
    const cleaned = {
      items: [{ sectionId: "s1", text: "Una domanda", criterionIds: [] }],
      hypotheses: [],
    };
    vi.mocked(cleanKitCriteria).mockResolvedValue(cleaned as any);

    const result = await saveInterviewKitAction(kitInput);

    expect(result).toEqual({ success: true, kitId: "kit-1" });
    expect(cleanKitCriteria).toHaveBeenCalledWith(
      prisma,
      "kit-1",
      "pos-1",
      expect.objectContaining({ hypotheses: kitInput.hypotheses }),
    );
    expect(syncKitItems).toHaveBeenCalledWith(prisma, "kit-1", cleaned.items);
    expect(db.interviewKit.update).toHaveBeenCalledWith({
      where: { id: "kit-1" },
      data: {
        briefing: ["Punto"],
        hypotheses: [],
        checklist: kitInput.checklist,
        missingSources: ["cv"],
      },
    });
    // The status is never changed by a save
    expect(db.interviewKit.update.mock.calls[0][0].data).not.toHaveProperty("status");
    expect(invalidateInterviewCache).toHaveBeenCalledWith({
      interviewId: "int-1",
      applicationId: "app-1",
    });
  });

  it("is refused when the interview is not scheduled", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("in_progress"));
    expect(await saveInterviewKitAction(kitInput)).toEqual({
      success: false,
      error: LOCKED,
    });
    expect(syncKitItems).not.toHaveBeenCalled();
    expect(invalidateInterviewCache).not.toHaveBeenCalled();
  });
});

describe("setInterviewKitStatusAction", () => {
  it("marks the kit ready while scheduled", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("scheduled"));

    expect(
      await setInterviewKitStatusAction({ interviewId: "int-1", status: "ready" }),
    ).toEqual({ success: true, status: "ready" });
    expect(db.interviewKit.update).toHaveBeenCalledWith({
      where: { id: "kit-1" },
      data: { status: "ready" },
    });
    expect(invalidateInterviewCache).toHaveBeenCalled();
  });

  it("is refused after the interview started", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("completed"));
    expect(
      await setInterviewKitStatusAction({ interviewId: "int-1", status: "draft" }),
    ).toEqual({ success: false, error: LOCKED });
  });
});

describe("saveKitItemNoteAction", () => {
  const item = (status: string) => ({
    id: "item-1",
    kit: { interview: { id: "int-1", status, applicationId: "app-1" } },
  });

  beforeEach(() => {
    db.kitItem.findUnique.mockResolvedValue(item("in_progress"));
    db.interviewParticipant.findUnique.mockResolvedValue({ id: "p-1", role: "lead" });
    db.interviewerFeedback.findUnique.mockResolvedValue(null);
    db.kitItemNote.upsert.mockResolvedValue({ id: "note-1", updatedAt: new Date("2026-11-17") });
  });

  it("upserts the participant's note with only the given fields and invalidates", async () => {
    const result = await saveKitItemNoteAction({
      kitItemId: "item-1",
      score: 4,
      evidenceQuote: null,
    });

    expect(result).toEqual({
      success: true,
      noteId: "note-1",
      updatedAt: new Date("2026-11-17"),
    });
    expect(db.interviewParticipant.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { interviewId_userId: { interviewId: "int-1", userId: "user-123" } },
      }),
    );
    expect(db.kitItemNote.upsert).toHaveBeenCalledWith({
      where: { kitItemId_participantId: { kitItemId: "item-1", participantId: "p-1" } },
      create: { kitItemId: "item-1", participantId: "p-1", score: 4, evidenceQuote: null },
      update: { score: 4, evidenceQuote: null },
      select: { id: true, updatedAt: true },
    });
    expect(invalidateInterviewCache).toHaveBeenCalledWith({
      interviewId: "int-1",
      applicationId: "app-1",
    });
  });

  it("accepts notes before the interview starts", async () => {
    db.kitItem.findUnique.mockResolvedValue(item("scheduled"));
    expect(await saveKitItemNoteAction({ kitItemId: "item-1", note: "x" })).toMatchObject({
      success: true,
    });
  });

  it("refuses a missing question", async () => {
    db.kitItem.findUnique.mockResolvedValue(null);
    expect(await saveKitItemNoteAction({ kitItemId: "nope", note: "x" })).toEqual({
      success: false,
      error: "Domanda non trovata",
    });
  });

  it("refuses a user who is not a participant", async () => {
    db.interviewParticipant.findUnique.mockResolvedValue(null);
    expect(await saveKitItemNoteAction({ kitItemId: "item-1", note: "x" })).toEqual({
      success: false,
      error: "Non partecipi a questo colloquio",
    });
    expect(db.kitItemNote.upsert).not.toHaveBeenCalled();
  });

  it("refuses notes after the author's scorecard was submitted", async () => {
    db.interviewerFeedback.findUnique.mockResolvedValue({ submittedAt: new Date() });
    expect(await saveKitItemNoteAction({ kitItemId: "item-1", note: "x" })).toEqual({
      success: false,
      error: "La scheda è già stata inviata",
    });
    expect(db.interviewerFeedback.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          interviewId_interviewerId: { interviewId: "int-1", interviewerId: "user-123" },
        },
      }),
    );
    expect(db.kitItemNote.upsert).not.toHaveBeenCalled();
  });

  it.each(["completed", "cancelled", "no_show"])(
    "refuses notes when the interview is %s",
    async (status) => {
      db.kitItem.findUnique.mockResolvedValue(item(status));
      expect(await saveKitItemNoteAction({ kitItemId: "item-1", note: "x" })).toEqual({
        success: false,
        error: NOTES_CLOSED,
      });
      expect(db.kitItemNote.upsert).not.toHaveBeenCalled();
    },
  );
});

describe("setKitItemCoveredAction", () => {
  const item = (status: string) => ({
    id: "item-1",
    kit: { interview: { id: "int-1", status, applicationId: "app-1" } },
  });

  it("sets the shared mark with its time and invalidates", async () => {
    db.kitItem.findUnique.mockResolvedValue(item("in_progress"));

    expect(await setKitItemCoveredAction({ kitItemId: "item-1", covered: true })).toEqual({
      success: true,
      covered: true,
    });
    const { data } = db.kitItem.update.mock.calls[0][0];
    expect(data.covered).toBe(true);
    expect(data.coveredAt).toBeInstanceOf(Date);
    // Shared: no participant check
    expect(db.interviewParticipant.findUnique).not.toHaveBeenCalled();
    expect(invalidateInterviewCache).toHaveBeenCalledWith({
      interviewId: "int-1",
      applicationId: "app-1",
    });
  });

  it("clears the time when uncovered", async () => {
    db.kitItem.findUnique.mockResolvedValue(item("scheduled"));
    await setKitItemCoveredAction({ kitItemId: "item-1", covered: false });
    expect(db.kitItem.update.mock.calls[0][0].data).toEqual({
      covered: false,
      coveredAt: null,
    });
  });

  it("is refused once the interview is over", async () => {
    db.kitItem.findUnique.mockResolvedValue(item("completed"));
    expect(await setKitItemCoveredAction({ kitItemId: "item-1", covered: true })).toEqual({
      success: false,
      error: NOTES_CLOSED,
    });
    expect(db.kitItem.update).not.toHaveBeenCalled();
  });
});
