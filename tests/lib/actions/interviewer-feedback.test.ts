import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    interview: { findUnique: vi.fn() },
    interviewParticipant: { findUnique: vi.fn() },
    interviewerFeedback: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    criterionScore: { deleteMany: vi.fn(), createMany: vi.fn() },
    scorecardCriterion: { findMany: vi.fn() },
    kitItem: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/services/interviews", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/interviews")>();
  return { ...actual, applyAllFeedbackCheck: vi.fn() };
});

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateInterviewCache: vi.fn(),
  invalidateCandidateCache: vi.fn(),
}));

import {
  saveInterviewerFeedbackAction,
  submitInterviewerFeedbackAction,
} from "@/lib/actions/interviewer-feedback";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { applyAllFeedbackCheck } from "@/lib/services/interviews";
import {
  invalidateCandidateCache,
  invalidateInterviewCache,
} from "@/lib/utils/cache-utils";

const db = prisma as any;

const interviewRow = (status: string) => ({
  id: "int-1",
  applicationId: "app-1",
  status,
  round: 1,
  application: { candidateId: "cand-1", positionId: "pos-1" },
});

const input = (overrides: Record<string, unknown> = {}) => ({
  interviewId: "int-1",
  hireRecommendation: "yes" as const,
  notes: "Buon colloquio",
  redFlags: [],
  standoutMoments: ["Ottima spiegazione"],
  scores: [
    { criterionId: "c-active", score: 4, evidence: "esempio" },
    { criterionId: "c-archived-cited", score: 3, evidence: null },
    { criterionId: "c-unscored", score: null, evidence: "" },
  ],
  ...overrides,
});

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
  vi.mocked(prisma.$transaction).mockImplementation(((fn: any) => fn(prisma)) as any);
  db.interview.findUnique.mockResolvedValue(interviewRow("completed"));
  db.interviewParticipant.findUnique.mockResolvedValue({ id: "p-1", role: "observer" });
  db.interviewerFeedback.findUnique.mockResolvedValue(null);
  db.interviewerFeedback.upsert.mockResolvedValue({ id: "fb-1" });
  db.scorecardCriterion.findMany.mockResolvedValue([
    { id: "c-active", archivedAt: null },
    { id: "c-unscored", archivedAt: null },
    { id: "c-archived-cited", archivedAt: new Date() },
    { id: "c-archived-other", archivedAt: new Date() },
  ]);
  db.kitItem.findMany.mockResolvedValue([{ criterionIds: ["c-archived-cited"] }]);
  vi.mocked(applyAllFeedbackCheck).mockResolvedValue(null);
});

describe("saveInterviewerFeedbackAction", () => {
  it("upserts the signed-in user's draft and stores only the scored criteria", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("in_progress"));

    const result = await saveInterviewerFeedbackAction(
      input({ hireRecommendation: null }),
    );

    expect(result).toEqual({ success: true, feedbackId: "fb-1" });
    expect(db.interviewerFeedback.upsert).toHaveBeenCalledWith({
      where: {
        interviewId_interviewerId: { interviewId: "int-1", interviewerId: "user-123" },
      },
      create: {
        interviewId: "int-1",
        interviewerId: "user-123",
        hireRecommendation: null,
        notes: "Buon colloquio",
        redFlags: [],
        standoutMoments: ["Ottima spiegazione"],
      },
      update: {
        hireRecommendation: null,
        notes: "Buon colloquio",
        redFlags: [],
        standoutMoments: ["Ottima spiegazione"],
      },
      select: { id: true },
    });
    expect(db.criterionScore.deleteMany).toHaveBeenCalledWith({
      where: { feedbackId: "fb-1" },
    });
    expect(db.criterionScore.createMany).toHaveBeenCalledWith({
      data: [
        { feedbackId: "fb-1", criterionId: "c-active", score: 4, evidence: "esempio" },
        { feedbackId: "fb-1", criterionId: "c-archived-cited", score: 3, evidence: null },
      ],
    });
    // A draft is never submitted and never advances the stage
    expect(db.interviewerFeedback.update).not.toHaveBeenCalled();
    expect(applyAllFeedbackCheck).not.toHaveBeenCalled();
    expect(invalidateInterviewCache).toHaveBeenCalledWith({
      interviewId: "int-1",
      applicationId: "app-1",
    });
  });

  it("refuses a user who is not a participant", async () => {
    db.interviewParticipant.findUnique.mockResolvedValue(null);
    expect(await saveInterviewerFeedbackAction(input())).toEqual({
      success: false,
      error: "Non partecipi a questo colloquio",
    });
    expect(db.interviewerFeedback.upsert).not.toHaveBeenCalled();
  });

  it("refuses to change a submitted scorecard", async () => {
    db.interviewerFeedback.findUnique.mockResolvedValue({
      id: "fb-1",
      submittedAt: new Date(),
    });
    expect(await saveInterviewerFeedbackAction(input())).toEqual({
      success: false,
      error: "Il feedback è già stato inviato",
    });
    expect(db.interviewerFeedback.upsert).not.toHaveBeenCalled();
    expect(db.criterionScore.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses a criterion that is archived and not cited by the kit", async () => {
    expect(
      await saveInterviewerFeedbackAction(
        input({ scores: [{ criterionId: "c-archived-other", score: 2, evidence: null }] }),
      ),
    ).toEqual({
      success: false,
      error: "Uno o più criteri non appartengono a questa posizione",
    });
    expect(db.interviewerFeedback.upsert).not.toHaveBeenCalled();
  });

  it("refuses a draft on a cancelled interview", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("cancelled"));
    expect(await saveInterviewerFeedbackAction(input())).toEqual({
      success: false,
      error: "Operazione non consentita nello stato attuale del colloquio",
    });
  });
});

describe("submitInterviewerFeedbackAction", () => {
  it("saves, sets the submission time and runs the all-feedback check", async () => {
    const before = Date.now();

    const result = await submitInterviewerFeedbackAction(input());

    expect(result).toEqual({ success: true, feedbackId: "fb-1", stageChanged: false });
    const update = db.interviewerFeedback.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: "fb-1" });
    expect(update.data.submittedAt).toBeInstanceOf(Date);
    expect(update.data.submittedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(applyAllFeedbackCheck).toHaveBeenCalledWith(prisma, "app-1");
    expect(invalidateInterviewCache).toHaveBeenCalledWith({
      interviewId: "int-1",
      applicationId: "app-1",
    });
    expect(invalidateCandidateCache).not.toHaveBeenCalled();
  });

  it("refreshes the candidates when the application moved to decision", async () => {
    vi.mocked(applyAllFeedbackCheck).mockResolvedValue({
      applicationId: "app-1",
      candidateId: "cand-1",
      positionId: "pos-1",
      previousStage: "interview",
      stage: "decision",
      changed: true,
      cancelledAssessmentIds: [],
      cancelledInterviewIds: [],
    });

    const result = await submitInterviewerFeedbackAction(input());

    expect(result).toEqual({ success: true, feedbackId: "fb-1", stageChanged: true });
    expect(invalidateCandidateCache).toHaveBeenCalledWith({
      candidateId: "cand-1",
      positionId: "pos-1",
      applicationId: "app-1",
    });
  });

  it("requires the final recommendation", async () => {
    expect(
      await submitInterviewerFeedbackAction(input({ hireRecommendation: null })),
    ).toEqual({ success: false, error: "Indica la raccomandazione finale" });
    expect(db.interviewerFeedback.upsert).not.toHaveBeenCalled();
  });

  it.each(["scheduled", "in_progress"])(
    "is refused before the interview is completed (%s)",
    async (status) => {
      db.interview.findUnique.mockResolvedValue(interviewRow(status));
      expect(await submitInterviewerFeedbackAction(input())).toEqual({
        success: false,
        error: "Puoi inviare il feedback solo a colloquio concluso",
      });
      expect(db.interviewerFeedback.upsert).not.toHaveBeenCalled();
    },
  );

  it("refuses a user who is not a participant", async () => {
    db.interviewParticipant.findUnique.mockResolvedValue(null);
    expect(await submitInterviewerFeedbackAction(input())).toEqual({
      success: false,
      error: "Non partecipi a questo colloquio",
    });
  });

  it("refuses a scorecard already submitted", async () => {
    db.interviewerFeedback.findUnique.mockResolvedValue({
      id: "fb-1",
      submittedAt: new Date(),
    });
    expect(await submitInterviewerFeedbackAction(input())).toEqual({
      success: false,
      error: "Il feedback è già stato inviato",
    });
    expect(db.interviewerFeedback.update).not.toHaveBeenCalled();
    expect(applyAllFeedbackCheck).not.toHaveBeenCalled();
  });

  it("never takes the interviewer from the input", async () => {
    await submitInterviewerFeedbackAction({
      ...input(),
      interviewerId: "someone-else",
    } as any);
    expect(db.interviewerFeedback.upsert.mock.calls[0][0].create.interviewerId).toBe(
      "user-123",
    );
  });
});
