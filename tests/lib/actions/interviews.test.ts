import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    application: { findUnique: vi.fn() },
    interview: { findUnique: vi.fn(), update: vi.fn() },
    user: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/services/interviews", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/interviews")>();
  return {
    ...actual,
    scheduleInterview: vi.fn(),
    syncInterviewParticipants: vi.fn(),
    applyAllFeedbackCheck: vi.fn(),
  };
});

vi.mock("@/lib/services/interview-kits", () => ({
  loadGuideForSnapshot: vi.fn(),
}));

vi.mock("@/lib/services/applications", () => ({
  advanceApplicationStage: vi.fn(),
}));

vi.mock("@/lib/services/scorecards", () => ({
  getActiveCriteria: vi.fn(),
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateInterviewCache: vi.fn(),
  invalidateCandidateCache: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
}));

import {
  cancelInterviewAction,
  completeInterviewAction,
  markInterviewNoShowAction,
  rescheduleInterviewAction,
  scheduleInterviewAction,
  startInterviewAction,
} from "@/lib/actions/interviews";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import {
  applyAllFeedbackCheck,
  scheduleInterview,
  syncInterviewParticipants,
} from "@/lib/services/interviews";
import { UserError } from "@/lib/services/user-error";
import {
  invalidateCandidateCache,
  invalidateInterviewCache,
} from "@/lib/utils/cache-utils";
import { redirect } from "next/navigation";

const db = prisma as any;
const tx = { marker: "tx" };
const WRONG_STATE = "Operazione non consentita nello stato attuale del colloquio";

const participants = [
  { userId: "u1", role: "lead" as const },
  { userId: "u2", role: "observer" as const },
];

const scheduleInput = {
  applicationId: "app-1",
  guideId: "guide-1",
  round: 1,
  scheduledAt: "2026-11-17T10:00:00+01:00",
  durationMinutes: 60,
  meetingUrl: "",
  participants,
};

const stageChange = (changed: boolean) => ({
  applicationId: "app-1",
  candidateId: "cand-1",
  positionId: "pos-1",
  previousStage: "assessment",
  stage: changed ? "interview" : "assessment",
  changed,
  cancelledAssessmentIds: [],
  cancelledInterviewIds: [],
});

const interviewRow = (status: string) => ({
  id: "int-1",
  applicationId: "app-1",
  status,
  round: 1,
  application: { candidateId: "cand-1", positionId: "pos-1" },
});

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123", role: "user" } as any);
  vi.mocked(prisma.$transaction).mockImplementation(((fn: any) => fn(tx)) as any);
  db.user.count.mockResolvedValue(2);
});

// The scheduling rules are tested on scheduleInterview in
// tests/lib/services/interviews.test.ts
describe("scheduleInterviewAction", () => {
  const scheduled = (changed: boolean) => ({
    interviewId: "int-new",
    applicationId: "app-1",
    candidateId: "cand-1",
    positionId: "pos-1",
    stage: stageChange(changed) as any,
  });

  beforeEach(() => {
    vi.mocked(scheduleInterview).mockResolvedValue(scheduled(true));
  });

  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));
    expect(await scheduleInterviewAction(scheduleInput)).toEqual({
      success: false,
      error: "Sessione scaduta. Accedi di nuovo per continuare.",
    });
    expect(scheduleInterview).not.toHaveBeenCalled();
  });

  it("returns the service refusal and neither invalidates nor redirects", async () => {
    vi.mocked(scheduleInterview).mockRejectedValue(
      new UserError("Candidatura non trovata o chiusa"),
    );

    expect(await scheduleInterviewAction(scheduleInput)).toEqual({
      success: false,
      error: "Candidatura non trovata o chiusa",
    });
    expect(invalidateInterviewCache).not.toHaveBeenCalled();
    expect(invalidateCandidateCache).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns the generic message when the transaction fails", async () => {
    vi.mocked(scheduleInterview).mockRejectedValue(new Error("db down"));

    expect(await scheduleInterviewAction(scheduleInput)).toEqual({
      success: false,
      error: "Si è verificato un errore. Riprova.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("delegates with the session actor, invalidates interview and candidates, then redirects", async () => {
    await scheduleInterviewAction(scheduleInput);

    expect(scheduleInterview).toHaveBeenCalledWith(
      { userId: "user-123", role: "user" },
      scheduleInput,
    );
    expect(invalidateInterviewCache).toHaveBeenCalledWith({
      interviewId: "int-new",
      applicationId: "app-1",
    });
    expect(invalidateCandidateCache).toHaveBeenCalledWith({
      candidateId: "cand-1",
      positionId: "pos-1",
      applicationId: "app-1",
    });
    expect(redirect).toHaveBeenCalledWith(
      "/dashboard/applications/app-1/interviews/int-new/prepare?scheduled=1",
    );
    // Invalidation happens before the redirect
    expect(vi.mocked(invalidateInterviewCache).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(redirect).mock.invocationCallOrder[0],
    );
  });

  it("does not refresh the candidates when the stage did not move", async () => {
    vi.mocked(scheduleInterview).mockResolvedValue(scheduled(false));

    await scheduleInterviewAction(scheduleInput);

    expect(invalidateInterviewCache).toHaveBeenCalled();
    expect(invalidateCandidateCache).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalled();
  });
});

describe("rescheduleInterviewAction", () => {
  const input = {
    interviewId: "int-1",
    scheduledAt: "2026-11-18T10:00:00+01:00",
    durationMinutes: 45,
    meetingUrl: "https://meet.example.com/y",
    participants,
  };

  it("updates the same interview, increments the sequence and syncs participants", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("scheduled"));
    const update = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementation(((fn: any) =>
      fn({ interview: { update } })) as any);

    const result = await rescheduleInterviewAction(input);

    expect(result).toEqual({ success: true, interviewId: "int-1" });
    expect(update).toHaveBeenCalledWith({
      where: { id: "int-1" },
      data: {
        scheduledAt: new Date("2026-11-18T10:00:00+01:00"),
        durationMinutes: 45,
        meetingUrl: "https://meet.example.com/y",
        sequence: { increment: 1 },
      },
    });
    expect(syncInterviewParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ interview: { update } }),
      "int-1",
      participants,
    );
    expect(invalidateInterviewCache).toHaveBeenCalledWith({
      interviewId: "int-1",
      applicationId: "app-1",
    });
  });

  it.each(["in_progress", "completed", "cancelled", "no_show"])(
    "is refused when the interview is %s",
    async (status) => {
      db.interview.findUnique.mockResolvedValue(interviewRow(status));
      expect(await rescheduleInterviewAction(input)).toEqual({
        success: false,
        error: WRONG_STATE,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it("refuses a missing interview", async () => {
    db.interview.findUnique.mockResolvedValue(null);
    expect(await rescheduleInterviewAction(input)).toEqual({
      success: false,
      error: "Colloquio non trovato",
    });
  });
});

describe("cancelInterviewAction / markInterviewNoShowAction", () => {
  it.each([
    [cancelInterviewAction, "cancelled"],
    [markInterviewNoShowAction, "no_show"],
  ] as const)("sets the status from scheduled and runs the feedback check", async (action, status) => {
    db.interview.findUnique.mockResolvedValue(interviewRow("scheduled"));
    const update = vi.fn();
    const txWithUpdate = { interview: { update } };
    vi.mocked(prisma.$transaction).mockImplementation(((fn: any) =>
      fn(txWithUpdate)) as any);
    vi.mocked(applyAllFeedbackCheck).mockResolvedValue(null);

    expect(await action({ interviewId: "int-1" })).toEqual({
      success: true,
      interviewId: "int-1",
    });
    expect(update).toHaveBeenCalledWith({ where: { id: "int-1" }, data: { status } });
    expect(applyAllFeedbackCheck).toHaveBeenCalledWith(txWithUpdate, "app-1");
    expect(invalidateInterviewCache).toHaveBeenCalledWith({
      interviewId: "int-1",
      applicationId: "app-1",
    });
    expect(invalidateCandidateCache).not.toHaveBeenCalled();
  });

  it("refreshes the candidates when the check moved the application to decision", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("scheduled"));
    vi.mocked(prisma.$transaction).mockImplementation(((fn: any) =>
      fn({ interview: { update: vi.fn() } })) as any);
    vi.mocked(applyAllFeedbackCheck).mockResolvedValue(stageChange(true) as any);

    await cancelInterviewAction({ interviewId: "int-1" });

    expect(invalidateCandidateCache).toHaveBeenCalledWith({
      candidateId: "cand-1",
      positionId: "pos-1",
      applicationId: "app-1",
    });
  });

  it.each([
    [cancelInterviewAction, "in_progress"],
    [cancelInterviewAction, "completed"],
    [markInterviewNoShowAction, "in_progress"],
    [markInterviewNoShowAction, "cancelled"],
  ] as const)("refuses a transition from a wrong state", async (action, status) => {
    db.interview.findUnique.mockResolvedValue(interviewRow(status));
    expect(await action({ interviewId: "int-1" })).toEqual({
      success: false,
      error: WRONG_STATE,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("startInterviewAction / completeInterviewAction", () => {
  it("starts a scheduled interview and records the start time", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("scheduled"));
    const before = Date.now();

    const result = await startInterviewAction({ interviewId: "int-1" });

    expect(result).toMatchObject({ success: true, interviewId: "int-1" });
    const { data } = db.interview.update.mock.calls[0][0];
    expect(data.status).toBe("in_progress");
    expect(data.startedAt).toBeInstanceOf(Date);
    expect(data.startedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect((result as any).startedAt).toBe(data.startedAt);
    expect(invalidateInterviewCache).toHaveBeenCalledWith({
      interviewId: "int-1",
      applicationId: "app-1",
    });
  });

  it("completes an interview in progress and records the end time", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("in_progress"));

    const result = await completeInterviewAction({ interviewId: "int-1" });

    expect(result).toMatchObject({ success: true, interviewId: "int-1" });
    const { data } = db.interview.update.mock.calls[0][0];
    expect(data.status).toBe("completed");
    expect(data.endedAt).toBeInstanceOf(Date);
  });

  it("refuses to start a running interview and to complete a scheduled one", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow("in_progress"));
    expect(await startInterviewAction({ interviewId: "int-1" })).toEqual({
      success: false,
      error: WRONG_STATE,
    });

    db.interview.findUnique.mockResolvedValue(interviewRow("scheduled"));
    expect(await completeInterviewAction({ interviewId: "int-1" })).toEqual({
      success: false,
      error: WRONG_STATE,
    });
    expect(db.interview.update).not.toHaveBeenCalled();
  });
});
