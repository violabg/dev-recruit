import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/applications", () => ({
  advanceApplicationStage: vi.fn(),
}));

import { advanceApplicationStage } from "@/lib/services/applications";
import { DEFAULT_KIT_CHECKLIST } from "@/lib/services/interview-kits";
import {
  applyAllFeedbackCheck,
  assertInterviewStatus,
  assertUsersExist,
  createInterviewWithKit,
  loadInterview,
  requireParticipant,
  syncInterviewParticipants,
} from "@/lib/services/interviews";

/** Transaction client with every delegate the interview service may touch */
function makeTx() {
  let sectionCount = 0;
  return {
    interview: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "int-new" }),
      update: vi.fn(),
    },
    interviewKit: { create: vi.fn().mockResolvedValue({ id: "kit-new" }) },
    kitSection: {
      create: vi.fn().mockImplementation(async () => ({ id: `sec-${++sectionCount}` })),
    },
    kitItem: { create: vi.fn() },
    interviewParticipant: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    kitItemNote: { count: vi.fn().mockResolvedValue(0) },
    interviewerFeedback: { count: vi.fn().mockResolvedValue(0) },
    user: { count: vi.fn() },
    // Never read again after the snapshot
    interviewGuide: { findUnique: vi.fn() },
    guideQuestion: { findMany: vi.fn() },
  };
}

const anchors = { weak: "debole", medium: "media", strong: "forte" };

const guide = {
  id: "guide-1",
  positionId: "pos-1",
  title: "Colloquio tecnico",
  round: 1,
  durationMinutes: 60,
  sections: [
    {
      id: "gs-1",
      title: "Introduzione",
      minutes: 5,
      kind: "intro" as const,
      questions: [
        { id: "gq-1", text: "Presentati", followUps: [], criterionIds: [], anchors, required: false },
      ],
    },
    {
      id: "gs-2",
      title: "Tecnica",
      minutes: 40,
      kind: "technical" as const,
      questions: [
        {
          id: "gq-2",
          text: "Come gestisci lo stato?",
          followUps: ["Perché?"],
          criterionIds: ["c-active", "c-archived", "c-unknown"],
          anchors,
          required: true,
        },
        { id: "gq-3", text: "Testing?", followUps: [], criterionIds: ["c-active"], anchors, required: false },
      ],
    },
  ],
};

const input = {
  applicationId: "app-1",
  guideId: "guide-1",
  round: 2,
  scheduledAt: "2026-11-17T09:00:00.000Z",
  durationMinutes: 45,
  meetingUrl: "",
  participants: [
    { userId: "u1", role: "lead" as const },
    { userId: "u2", role: "observer" as const },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadInterview", () => {
  it("returns the interview with its application ids", async () => {
    const tx = makeTx();
    tx.interview.findUnique.mockResolvedValue({
      id: "int-1",
      applicationId: "app-1",
      status: "scheduled",
      round: 1,
      application: { candidateId: "cand-1", positionId: "pos-1" },
    });

    await expect(loadInterview(tx as any, "int-1")).resolves.toEqual({
      id: "int-1",
      applicationId: "app-1",
      candidateId: "cand-1",
      positionId: "pos-1",
      status: "scheduled",
      round: 1,
    });
  });

  it("refuses a missing interview", async () => {
    const tx = makeTx();
    tx.interview.findUnique.mockResolvedValue(null);
    await expect(loadInterview(tx as any, "nope")).rejects.toThrow("Colloquio non trovato");
  });
});

describe("assertInterviewStatus", () => {
  it("passes for an allowed status and refuses the others", () => {
    expect(() => assertInterviewStatus({ status: "scheduled" }, ["scheduled"])).not.toThrow();
    expect(() => assertInterviewStatus({ status: "completed" }, ["scheduled"])).toThrow(
      "Operazione non consentita nello stato attuale del colloquio",
    );
    expect(() =>
      assertInterviewStatus({ status: "completed" }, ["scheduled"], "Messaggio dedicato"),
    ).toThrow("Messaggio dedicato");
  });
});

describe("requireParticipant", () => {
  it("returns the participant row of the user", async () => {
    const tx = makeTx();
    tx.interviewParticipant.findUnique.mockResolvedValue({ id: "p1", role: "lead" });

    await expect(requireParticipant(tx as any, "int-1", "u1")).resolves.toEqual({
      id: "p1",
      role: "lead",
    });
    expect(tx.interviewParticipant.findUnique).toHaveBeenCalledWith({
      where: { interviewId_userId: { interviewId: "int-1", userId: "u1" } },
      select: { id: true, role: true },
    });
  });

  it("refuses a user who is not a participant", async () => {
    const tx = makeTx();
    tx.interviewParticipant.findUnique.mockResolvedValue(null);
    await expect(requireParticipant(tx as any, "int-1", "u9")).rejects.toThrow(
      "Non partecipi a questo colloquio",
    );
  });
});

describe("assertUsersExist", () => {
  it("passes when every unique id is a user", async () => {
    const tx = makeTx();
    tx.user.count.mockResolvedValue(2);
    await expect(assertUsersExist(tx as any, ["u1", "u2", "u1"])).resolves.toBeUndefined();
    expect(tx.user.count).toHaveBeenCalledWith({ where: { id: { in: ["u1", "u2"] } } });
  });

  it("refuses an id that is not a user of the app", async () => {
    const tx = makeTx();
    tx.user.count.mockResolvedValue(1);
    await expect(assertUsersExist(tx as any, ["u1", "outsider"])).rejects.toThrow(
      "Uno o più partecipanti non sono utenti dell'app",
    );
  });
});

describe("createInterviewWithKit", () => {
  const active = new Set(["c-active"]);

  it("creates the scheduled interview with its participants", async () => {
    const tx = makeTx();

    await expect(
      createInterviewWithKit(tx as any, input, guide, "user-123", active),
    ).resolves.toEqual({ interviewId: "int-new", kitId: "kit-new" });

    expect(tx.interview.create).toHaveBeenCalledWith({
      data: {
        applicationId: "app-1",
        guideId: "guide-1",
        round: 2,
        scheduledAt: new Date("2026-11-17T09:00:00.000Z"),
        durationMinutes: 45,
        meetingUrl: null,
        status: "scheduled",
        createdBy: "user-123",
        participants: {
          create: [
            { userId: "u1", role: "lead" },
            { userId: "u2", role: "observer" },
          ],
        },
      },
      select: { id: true },
    });
  });

  it("creates a draft kit with the default checklist, not done, with fresh ids", async () => {
    const tx = makeTx();
    await createInterviewWithKit(tx as any, input, guide, "user-123", active);

    const kitData = tx.interviewKit.create.mock.calls[0][0].data;
    expect(kitData).toMatchObject({
      interviewId: "int-new",
      status: "draft",
      briefing: [],
      hypotheses: [],
    });
    expect(kitData.checklist).toHaveLength(DEFAULT_KIT_CHECKLIST.length);
    kitData.checklist.forEach((row: any, index: number) => {
      expect(row).toMatchObject({ ...DEFAULT_KIT_CHECKLIST[index], done: false });
      expect(typeof row.id).toBe("string");
    });
    expect(new Set(kitData.checklist.map((row: any) => row.id)).size).toBe(
      DEFAULT_KIT_CHECKLIST.length,
    );
  });

  it("snapshots every section and question with origin template and their order", async () => {
    const tx = makeTx();
    await createInterviewWithKit(tx as any, input, guide, "user-123", active);

    expect(tx.kitSection.create.mock.calls.map((call) => call[0].data)).toEqual([
      { kitId: "kit-new", title: "Introduzione", minutes: 5, order: 0, kind: "intro" },
      { kitId: "kit-new", title: "Tecnica", minutes: 40, order: 1, kind: "technical" },
    ]);
    expect(tx.kitItem.create.mock.calls.map((call) => call[0].data)).toEqual([
      {
        kitId: "kit-new",
        sectionId: "sec-1",
        text: "Presentati",
        followUps: [],
        criterionIds: [],
        anchors,
        required: false,
        order: 0,
        origin: "template",
        edited: false,
      },
      {
        kitId: "kit-new",
        sectionId: "sec-2",
        text: "Come gestisci lo stato?",
        followUps: ["Perché?"],
        // Archived and unknown criteria never reach a new kit
        criterionIds: ["c-active"],
        anchors,
        required: true,
        order: 0,
        origin: "template",
        edited: false,
      },
      {
        kitId: "kit-new",
        sectionId: "sec-2",
        text: "Testing?",
        followUps: [],
        criterionIds: ["c-active"],
        anchors,
        required: false,
        order: 1,
        origin: "template",
        edited: false,
      },
    ]);
    // The guide is never read again
    expect(tx.interviewGuide.findUnique).not.toHaveBeenCalled();
    expect(tx.guideQuestion.findMany).not.toHaveBeenCalled();
  });

  it("keeps the call link when given", async () => {
    const tx = makeTx();
    await createInterviewWithKit(
      tx as any,
      { ...input, meetingUrl: "https://meet.example.com/x" },
      guide,
      "user-123",
      active,
    );
    expect(tx.interview.create.mock.calls[0][0].data.meetingUrl).toBe(
      "https://meet.example.com/x",
    );
  });
});

describe("syncInterviewParticipants", () => {
  it("adds new participants, updates changed roles and deletes removed ones without material", async () => {
    const tx = makeTx();
    tx.interviewParticipant.findMany.mockResolvedValue([
      { id: "p1", userId: "u1", role: "lead" },
      { id: "p2", userId: "u2", role: "observer" },
      { id: "p3", userId: "u3", role: "observer" },
    ]);

    await syncInterviewParticipants(tx as any, "int-1", [
      { userId: "u1", role: "observer" },
      { userId: "u2", role: "lead" },
      { userId: "u4", role: "observer" },
    ]);

    expect(tx.interviewParticipant.create).toHaveBeenCalledWith({
      data: { interviewId: "int-1", userId: "u4", role: "observer" },
    });
    expect(tx.interviewParticipant.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { role: "observer" },
    });
    expect(tx.interviewParticipant.update).toHaveBeenCalledWith({
      where: { id: "p2" },
      data: { role: "lead" },
    });
    expect(tx.kitItemNote.count).toHaveBeenCalledWith({ where: { participantId: "p3" } });
    expect(tx.interviewerFeedback.count).toHaveBeenCalledWith({
      where: { interviewId: "int-1", interviewerId: "u3" },
    });
    expect(tx.interviewParticipant.delete).toHaveBeenCalledWith({ where: { id: "p3" } });
  });

  it("leaves unchanged participants untouched", async () => {
    const tx = makeTx();
    tx.interviewParticipant.findMany.mockResolvedValue([
      { id: "p1", userId: "u1", role: "lead" },
    ]);

    await syncInterviewParticipants(tx as any, "int-1", [{ userId: "u1", role: "lead" }]);

    expect(tx.interviewParticipant.create).not.toHaveBeenCalled();
    expect(tx.interviewParticipant.update).not.toHaveBeenCalled();
    expect(tx.interviewParticipant.delete).not.toHaveBeenCalled();
  });

  it("refuses to remove a participant with notes", async () => {
    const tx = makeTx();
    tx.interviewParticipant.findMany.mockResolvedValue([
      { id: "p1", userId: "u1", role: "lead" },
      { id: "p2", userId: "u2", role: "observer" },
    ]);
    tx.kitItemNote.count.mockResolvedValue(1);

    await expect(
      syncInterviewParticipants(tx as any, "int-1", [{ userId: "u1", role: "lead" }]),
    ).rejects.toThrow("Il partecipante ha già note o una scheda");
    expect(tx.interviewParticipant.delete).not.toHaveBeenCalled();
  });

  it("refuses to remove a participant with a scorecard", async () => {
    const tx = makeTx();
    tx.interviewParticipant.findMany.mockResolvedValue([
      { id: "p1", userId: "u1", role: "lead" },
      { id: "p2", userId: "u2", role: "observer" },
    ]);
    tx.interviewerFeedback.count.mockResolvedValue(1);

    await expect(
      syncInterviewParticipants(tx as any, "int-1", [{ userId: "u1", role: "lead" }]),
    ).rejects.toThrow("Il partecipante ha già note o una scheda");
    expect(tx.interviewParticipant.delete).not.toHaveBeenCalled();
  });
});

describe("applyAllFeedbackCheck", () => {
  const interview = (
    status: string,
    participants: string[],
    submitted: string[],
  ) => ({
    status,
    participants: participants.map((userId) => ({ userId })),
    feedback: submitted.map((interviewerId) => ({ interviewerId })),
  });

  it("reads the submitted scorecards and advances when every scorecard is in", async () => {
    const tx = makeTx();
    const change = { changed: true, stage: "decision" };
    tx.interview.findMany.mockResolvedValue([
      interview("completed", ["u1", "u2"], ["u1", "u2"]),
      interview("cancelled", ["u3"], []),
    ]);
    vi.mocked(advanceApplicationStage).mockResolvedValue(change as any);

    await expect(applyAllFeedbackCheck(tx as any, "app-1")).resolves.toBe(change);
    expect(tx.interview.findMany).toHaveBeenCalledWith({
      where: { applicationId: "app-1" },
      select: {
        status: true,
        participants: { select: { userId: true } },
        feedback: {
          where: { submittedAt: { not: null } },
          select: { interviewerId: true },
        },
      },
    });
    expect(advanceApplicationStage).toHaveBeenCalledWith(
      tx,
      "app-1",
      "all_feedback_submitted",
    );
  });

  it("does nothing while a scorecard is missing or a round is still open", async () => {
    const tx = makeTx();
    tx.interview.findMany.mockResolvedValue([
      interview("completed", ["u1", "u2"], ["u1"]),
    ]);
    await expect(applyAllFeedbackCheck(tx as any, "app-1")).resolves.toBeNull();

    tx.interview.findMany.mockResolvedValue([
      interview("completed", ["u1"], ["u1"]),
      interview("scheduled", ["u1"], []),
    ]);
    await expect(applyAllFeedbackCheck(tx as any, "app-1")).resolves.toBeNull();

    expect(advanceApplicationStage).not.toHaveBeenCalled();
  });
});
