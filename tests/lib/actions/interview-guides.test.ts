import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    position: { findUnique: vi.fn() },
    interviewGuide: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    guideSection: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    guideQuestion: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/services/interview-guides", () => ({
  syncInterviewGuide: vi.fn(),
}));

vi.mock("@/lib/services/scorecards", () => ({
  assertActiveCriteria: vi.fn(),
  getActiveCriteria: vi.fn(),
}));

vi.mock("@/lib/services/ai/guide-generation", () => ({
  generateInterviewGuide: vi.fn(),
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateInterviewGuideCache: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
}));

import {
  deleteInterviewGuideAction,
  generateInterviewGuideAction,
  upsertInterviewGuideAction,
} from "@/lib/actions/interview-guides";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { generateInterviewGuide } from "@/lib/services/ai/guide-generation";
import { syncInterviewGuide } from "@/lib/services/interview-guides";
import { UserError } from "@/lib/services/user-error";
import {
  assertActiveCriteria,
  getActiveCriteria,
} from "@/lib/services/scorecards";
import { invalidateInterviewGuideCache } from "@/lib/utils/cache-utils";
import { redirect } from "next/navigation";

const EXPIRED = "Sessione scaduta. Accedi di nuovo per continuare.";

const question = (criterionIds: string[]) => ({
  text: "Raccontami un progetto",
  followUps: [],
  criterionIds,
  anchors: { weak: "", medium: "", strong: "" },
  required: false,
});

const guideData = (criterionIds: string[][] = [["c-1"]]) => ({
  title: "Colloquio tecnico",
  round: 1,
  durationMinutes: 60,
  sections: [
    {
      title: "Tecnica",
      minutes: 30,
      kind: "technical" as const,
      questions: criterionIds.map(question),
    },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
  vi.mocked(prisma.position.findUnique).mockResolvedValue({
    id: "pos-1",
    title: "Frontend Developer",
    experienceLevel: "senior",
    description: "Team prodotto",
  } as any);
  vi.mocked(prisma.interviewGuide.findUnique).mockResolvedValue({
    id: "g-1",
    positionId: "pos-1",
    sections: [{ questions: [{ criterionIds: ["c-archived"] }] }],
  } as any);
  vi.mocked(prisma.$transaction).mockImplementation(((fn: (tx: unknown) => unknown) =>
    fn(prisma)) as any);
  vi.mocked(syncInterviewGuide).mockResolvedValue({ id: "g-1" });
  vi.mocked(assertActiveCriteria).mockResolvedValue(undefined);
  vi.mocked(getActiveCriteria).mockResolvedValue([
    {
      id: "c-1",
      name: "React",
      description: null,
      category: "technical",
      priority: "must",
      weight: 3,
      expectedLevel: 3,
    },
  ]);
});

describe("upsertInterviewGuideAction", () => {
  it("returns the expired-session result without a session", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await upsertInterviewGuideAction({
      ...guideData(),
      positionId: "pos-1",
    });

    expect(result).toEqual({ success: false, error: EXPIRED });
    expect(syncInterviewGuide).not.toHaveBeenCalled();
  });

  it("refuses a guide that does not exist", async () => {
    vi.mocked(prisma.interviewGuide.findUnique).mockResolvedValueOnce(null);

    const result = await upsertInterviewGuideAction({
      ...guideData(),
      guideId: "g-x",
    });

    expect(result).toEqual({ success: false, error: "Guida non trovata" });
    expect(syncInterviewGuide).not.toHaveBeenCalled();
  });

  it("refuses a position that does not exist", async () => {
    vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

    const result = await upsertInterviewGuideAction({
      ...guideData(),
      positionId: "pos-x",
    });

    expect(result).toEqual({ success: false, error: "Posizione non trovata" });
  });

  it("refuses input with neither guide nor position", async () => {
    const result = await upsertInterviewGuideAction(guideData() as any);

    expect(result).toEqual({
      success: false,
      error: "La posizione è obbligatoria per creare una guida",
    });
  });

  it("creates a guide: checks every criterion, saves in a transaction, invalidates", async () => {
    const result = await upsertInterviewGuideAction({
      ...guideData([["c-1", "c-2"], ["c-1"]]),
      positionId: "pos-1",
    });

    expect(assertActiveCriteria).toHaveBeenCalledWith("pos-1", ["c-1", "c-2"]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(syncInterviewGuide).toHaveBeenCalledWith(prisma, {
      guideId: undefined,
      positionId: "pos-1",
      data: guideData([["c-1", "c-2"], ["c-1"]]),
      userId: "user-123",
    });
    expect(invalidateInterviewGuideCache).toHaveBeenCalledWith({
      guideId: "g-1",
      positionId: "pos-1",
    });
    expect(result).toEqual({ success: true, id: "g-1" });
  });

  it("updating skips ids already stored anywhere on the same guide", async () => {
    // c-archived is stored on another question of this guide: accepted even
    // when moved to a different question
    await upsertInterviewGuideAction({
      ...guideData([["c-archived", "c-1"]]),
      guideId: "g-1",
    });

    expect(prisma.interviewGuide.findUnique).toHaveBeenCalledWith({
      where: { id: "g-1" },
      select: {
        id: true,
        positionId: true,
        sections: {
          select: { questions: { select: { criterionIds: true } } },
        },
      },
    });
    expect(assertActiveCriteria).toHaveBeenCalledWith("pos-1", ["c-1"]);
    expect(syncInterviewGuide).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ guideId: "g-1", positionId: "pos-1" }),
    );
  });

  it("returns the criteria error and saves nothing when a criterion is not active", async () => {
    vi.mocked(assertActiveCriteria).mockRejectedValueOnce(
      new UserError(
        "Uno o più criteri selezionati non appartengono alla scheda della posizione",
      ),
    );

    const result = await upsertInterviewGuideAction({
      ...guideData([["c-foreign"]]),
      positionId: "pos-1",
    });

    expect(result).toEqual({
      success: false,
      error:
        "Uno o più criteri selezionati non appartengono alla scheda della posizione",
    });
    expect(syncInterviewGuide).not.toHaveBeenCalled();
    expect(invalidateInterviewGuideCache).not.toHaveBeenCalled();
  });

  it("refuses a section kind outside the six values", async () => {
    const data = guideData();
    const result = await upsertInterviewGuideAction({
      ...data,
      sections: [{ ...data.sections[0], kind: "lunch" as any }],
      positionId: "pos-1",
    });

    expect(result).toEqual({
      success: false,
      error: "Tipo di sezione non valido",
    });
  });
});

describe("deleteInterviewGuideAction", () => {
  it("returns the expired-session result without a session", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await deleteInterviewGuideAction("g-1");

    expect(result).toEqual({ success: false, error: EXPIRED });
    expect(prisma.interviewGuide.delete).not.toHaveBeenCalled();
  });

  it("refuses a guide that does not exist", async () => {
    vi.mocked(prisma.interviewGuide.findUnique).mockResolvedValueOnce(null);

    const result = await deleteInterviewGuideAction("g-x");

    expect(result).toEqual({ success: false, error: "Guida non trovata" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("deletes, invalidates and redirects to the guides tab", async () => {
    await deleteInterviewGuideAction("g-1");

    expect(prisma.interviewGuide.delete).toHaveBeenCalledWith({
      where: { id: "g-1" },
    });
    expect(invalidateInterviewGuideCache).toHaveBeenCalledWith({
      guideId: "g-1",
      positionId: "pos-1",
    });
    expect(redirect).toHaveBeenCalledWith("/dashboard/positions/pos-1?tab=guide");
  });
});

describe("generateInterviewGuideAction", () => {
  const input = {
    positionId: "pos-1",
    title: "Colloquio tecnico",
    round: 2,
    durationMinutes: 45,
    instructions: "",
  };
  const generated = {
    sections: [
      {
        title: "Tecnica",
        minutes: 45,
        kind: "technical" as const,
        questions: [question(["c-1"])],
      },
    ],
  };

  beforeEach(() => {
    vi.mocked(generateInterviewGuide).mockResolvedValue(generated);
  });

  it("returns the expired-session result without a session", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    expect(await generateInterviewGuideAction(input)).toEqual({
      success: false,
      error: EXPIRED,
    });
  });

  it("refuses a position that does not exist", async () => {
    vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

    expect(await generateInterviewGuideAction(input)).toEqual({
      success: false,
      error: "Posizione non trovata",
    });
  });

  it("refuses a position without active criteria and writes nothing", async () => {
    vi.mocked(getActiveCriteria).mockResolvedValueOnce([]);

    const result = await generateInterviewGuideAction(input);

    expect(result).toEqual({
      success: false,
      error: "Crea prima la scheda di valutazione della posizione",
    });
    expect(generateInterviewGuide).not.toHaveBeenCalled();
    expect(invalidateInterviewGuideCache).not.toHaveBeenCalled();
    expect(syncInterviewGuide).not.toHaveBeenCalled();
  });

  it("returns the generated guide and never writes or invalidates", async () => {
    const result = await generateInterviewGuideAction(input);

    expect(generateInterviewGuide).toHaveBeenCalledWith(
      expect.objectContaining({
        positionTitle: "Frontend Developer",
        experienceLevel: "senior",
        title: "Colloquio tecnico",
        round: 2,
        durationMinutes: 45,
        instructions: undefined,
        criteria: [expect.objectContaining({ id: "c-1" })],
      }),
    );
    expect(result).toEqual({ success: true, ...generated });
    expect(invalidateInterviewGuideCache).not.toHaveBeenCalled();
    expect(syncInterviewGuide).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    for (const write of [
      prisma.interviewGuide.create,
      prisma.interviewGuide.update,
      prisma.interviewGuide.delete,
      prisma.guideSection.create,
      prisma.guideSection.update,
      prisma.guideSection.deleteMany,
      prisma.guideQuestion.create,
      prisma.guideQuestion.update,
      prisma.guideQuestion.deleteMany,
    ]) {
      expect(write).not.toHaveBeenCalled();
    }
  });
});
