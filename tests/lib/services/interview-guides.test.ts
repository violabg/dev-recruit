import type { InterviewGuideEditorData } from "@/lib/schemas";
import { syncInterviewGuide } from "@/lib/services/interview-guides";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Transaction client with the guide delegates */
function makeTx() {
  let created = 0;
  return {
    interviewGuide: {
      create: vi.fn().mockResolvedValue({ id: "g-new" }),
      update: vi.fn().mockResolvedValue({ id: "g-1" }),
    },
    guideSection: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(() => Promise.resolve({ id: `s-new-${++created}` })),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    guideQuestion: {
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
}

const question = (overrides: Record<string, unknown> = {}) => ({
  text: "Raccontami un progetto",
  followUps: ["Che ruolo avevi?"],
  criterionIds: ["c-1"],
  anchors: { weak: "w", medium: "m", strong: "s" },
  required: true,
  ...overrides,
});

const data = (
  sections: InterviewGuideEditorData["sections"],
): InterviewGuideEditorData => ({
  title: "Colloquio tecnico",
  round: 1,
  durationMinutes: 60,
  sections,
});

describe("syncInterviewGuide", () => {
  let tx: ReturnType<typeof makeTx>;

  beforeEach(() => {
    tx = makeTx();
  });

  it("creates the guide, its sections and questions in order", async () => {
    const result = await syncInterviewGuide(tx as any, {
      positionId: "pos-1",
      userId: "user-1",
      data: data([
        {
          title: "Introduzione",
          minutes: 5,
          kind: "intro",
          questions: [],
        },
        {
          title: "Tecnica",
          minutes: 30,
          kind: "technical",
          questions: [question({ text: "Q1" }), question({ text: "Q2" })],
        },
      ]),
    });

    expect(tx.interviewGuide.create).toHaveBeenCalledWith({
      data: {
        positionId: "pos-1",
        title: "Colloquio tecnico",
        round: 1,
        durationMinutes: 60,
        createdBy: "user-1",
      },
      select: { id: true },
    });
    expect(tx.interviewGuide.update).not.toHaveBeenCalled();
    expect(tx.guideSection.create).toHaveBeenNthCalledWith(1, {
      data: {
        title: "Introduzione",
        minutes: 5,
        kind: "intro",
        order: 0,
        guideId: "g-new",
      },
      select: { id: true },
    });
    expect(tx.guideSection.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ title: "Tecnica", order: 1 }),
      select: { id: true },
    });
    expect(tx.guideQuestion.create).toHaveBeenNthCalledWith(1, {
      data: {
        text: "Q1",
        followUps: ["Che ruolo avevi?"],
        criterionIds: ["c-1"],
        anchors: { weak: "w", medium: "m", strong: "s" },
        required: true,
        order: 0,
        sectionId: "s-new-2",
      },
    });
    expect(tx.guideQuestion.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ text: "Q2", order: 1 }),
    });
    expect(result).toEqual({ id: "g-new" });
  });

  it("updates the guide and keeps the ids of the kept sections and questions", async () => {
    tx.guideSection.findMany.mockResolvedValue([
      { id: "s-1", questions: [{ id: "q-1" }, { id: "q-2" }] },
      { id: "s-2", questions: [{ id: "q-3" }] },
    ]);

    const result = await syncInterviewGuide(tx as any, {
      guideId: "g-1",
      positionId: "pos-1",
      userId: "user-1",
      data: data([
        {
          id: "s-1",
          title: "Esperienza aggiornata",
          minutes: 20,
          kind: "experience",
          questions: [
            question({ id: "q-2", text: "Spostata in cima" }),
            question({ text: "Nuova" }),
          ],
        },
      ]),
    });

    expect(tx.interviewGuide.update).toHaveBeenCalledWith({
      where: { id: "g-1" },
      data: { title: "Colloquio tecnico", round: 1, durationMinutes: 60 },
      select: { id: true },
    });
    expect(tx.interviewGuide.create).not.toHaveBeenCalled();
    expect(tx.guideSection.findMany).toHaveBeenCalledWith({
      where: { guideId: "g-1" },
      select: { id: true, questions: { select: { id: true } } },
    });
    expect(tx.guideSection.update).toHaveBeenCalledWith({
      where: { id: "s-1" },
      data: {
        title: "Esperienza aggiornata",
        minutes: 20,
        kind: "experience",
        order: 0,
      },
    });
    expect(tx.guideQuestion.update).toHaveBeenCalledWith({
      where: { id: "q-2" },
      data: expect.objectContaining({ text: "Spostata in cima", order: 0 }),
    });
    expect(tx.guideQuestion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        text: "Nuova",
        order: 1,
        sectionId: "s-1",
      }),
    });
    // q-1 is missing from the input: deleted
    expect(tx.guideQuestion.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["q-1"] } },
    });
    // s-2 is missing from the input: deleted (its questions cascade)
    expect(tx.guideSection.deleteMany).toHaveBeenCalledWith({
      where: { guideId: "g-1", id: { notIn: ["s-1"] } },
    });
    expect(result).toEqual({ id: "g-1" });
  });

  it("treats a question id of another section as new", async () => {
    tx.guideSection.findMany.mockResolvedValue([
      { id: "s-1", questions: [{ id: "q-1" }] },
      { id: "s-2", questions: [] },
    ]);

    await syncInterviewGuide(tx as any, {
      guideId: "g-1",
      positionId: "pos-1",
      userId: "user-1",
      data: data([
        { id: "s-1", title: "Uno", minutes: 10, kind: "technical", questions: [] },
        {
          id: "s-2",
          title: "Due",
          minutes: 10,
          kind: "behavioral",
          questions: [question({ id: "q-1" })],
        },
      ]),
    });

    expect(tx.guideQuestion.update).not.toHaveBeenCalled();
    expect(tx.guideQuestion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sectionId: "s-2", order: 0 }),
    });
    expect(tx.guideQuestion.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["q-1"] } },
    });
  });

  it("creates a section whose id does not belong to the guide", async () => {
    tx.guideSection.findMany.mockResolvedValue([]);

    await syncInterviewGuide(tx as any, {
      guideId: "g-1",
      positionId: "pos-1",
      userId: "user-1",
      data: data([
        {
          id: "s-foreign",
          title: "Altra",
          minutes: 10,
          kind: "closing",
          questions: [],
        },
      ]),
    });

    expect(tx.guideSection.update).not.toHaveBeenCalled();
    expect(tx.guideSection.create).toHaveBeenCalledTimes(1);
    expect(tx.guideSection.deleteMany).toHaveBeenCalledWith({
      where: { guideId: "g-1", id: { notIn: ["s-new-1"] } },
    });
  });
});
