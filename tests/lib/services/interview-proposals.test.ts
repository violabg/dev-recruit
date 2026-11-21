import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/interviews", () => ({
  assertUsersExist: vi.fn(),
  scheduleInterview: vi.fn(),
}));

vi.mock("@/lib/services/interview-kits", () => ({
  loadGuideForSnapshot: vi.fn(),
}));

import prisma from "@/lib/prisma";
import type { Actor } from "@/lib/services/actor";
import { loadGuideForSnapshot } from "@/lib/services/interview-kits";
import {
  confirmInterviewProposal,
  discardInterviewProposal,
  listPendingProposals,
  proposeInterviewSlot,
} from "@/lib/services/interview-proposals";
import { assertUsersExist, scheduleInterview } from "@/lib/services/interviews";

const actor: Actor = { userId: "u1", role: "user" };

const payload = {
  applicationId: "app-1",
  guideId: "guide-1",
  round: 1,
  scheduledAt: "2026-11-25T10:00:00+01:00",
  durationMinutes: 45,
  meetingUrl: "",
  participants: [
    { userId: "u1", role: "lead" as const },
    { userId: "u2", role: "observer" as const },
  ],
};

beforeEach(() => {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ emailVerified: true, banned: false } as any);
  vi.mocked(prisma.application.findUnique).mockResolvedValue({
    id: "app-1",
    stage: "screening",
    positionId: "pos-1",
  } as any);
  vi.mocked(prisma.interviewProposal.create).mockResolvedValue({ id: "prop-1" } as any);
  vi.mocked(prisma.interviewProposal.findUnique).mockResolvedValue({
    status: "pending",
    payload,
  } as any);
  vi.mocked(prisma.interviewProposal.updateMany).mockResolvedValue({ count: 1 } as any);
  vi.mocked(prisma.interviewProposal.update).mockResolvedValue({} as any);
  vi.mocked(scheduleInterview).mockResolvedValue({
    interviewId: "int-1",
    applicationId: "app-1",
    candidateId: "c1",
    positionId: "pos-1",
    stage: null,
  });
});

describe("proposeInterviewSlot", () => {
  it("checks participants and guide, then stores the payload pending", async () => {
    const result = await proposeInterviewSlot(actor, payload);

    expect(result).toEqual({ proposalId: "prop-1", applicationId: "app-1" });
    expect(assertUsersExist).toHaveBeenCalledWith(prisma, ["u1", "u2"]);
    expect(loadGuideForSnapshot).toHaveBeenCalledWith(prisma, "guide-1", "pos-1");
    expect(prisma.interviewProposal.create).toHaveBeenCalledWith({
      data: { applicationId: "app-1", payload, createdBy: "u1" },
      select: { id: true },
    });
    expect(scheduleInterview).not.toHaveBeenCalled();
  });

  it("refuses a closed application", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
      id: "app-1",
      stage: "rejected",
      positionId: "pos-1",
    } as any);

    await expect(proposeInterviewSlot(actor, payload)).rejects.toThrow(
      "Candidatura non trovata o chiusa",
    );
    expect(prisma.interviewProposal.create).not.toHaveBeenCalled();
  });

  it("refuses two leads with the scheduling form message", async () => {
    await expect(
      proposeInterviewSlot(actor, {
        ...payload,
        participants: [
          { userId: "u1", role: "lead" },
          { userId: "u2", role: "lead" },
        ],
      }),
    ).rejects.toThrow("Indica un solo conduttore");
  });

  it("refuses a disabled actor", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ emailVerified: false, banned: false } as any);
    await expect(proposeInterviewSlot(actor, payload)).rejects.toThrow("Sessione scaduta");
  });
});

describe("listPendingProposals", () => {
  it("keeps the proposals whose payload still parses", async () => {
    vi.mocked(prisma.interviewProposal.findMany).mockResolvedValue([
      { id: "p1", applicationId: "app-1", payload, createdAt: new Date(), createdBy: "u1" },
      { id: "p2", applicationId: "app-1", payload: { broken: true }, createdAt: new Date(), createdBy: "u1" },
    ] as any);

    const rows = await listPendingProposals("app-1");

    expect(rows.map((row) => row.id)).toEqual(["p1"]);
    expect(prisma.interviewProposal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { applicationId: "app-1", status: "pending" } }),
    );
  });
});

describe("confirmInterviewProposal", () => {
  it("claims the proposal, schedules it and links the interview", async () => {
    const result = await confirmInterviewProposal(actor, "prop-1");

    expect(prisma.interviewProposal.updateMany).toHaveBeenCalledWith({
      where: { id: "prop-1", status: "pending" },
      data: expect.objectContaining({ status: "scheduled", handledBy: "u1" }),
    });
    expect(scheduleInterview).toHaveBeenCalledWith(actor, payload);
    expect(prisma.interviewProposal.update).toHaveBeenCalledWith({
      where: { id: "prop-1" },
      data: { interviewId: "int-1" },
    });
    expect(result).toEqual({ interviewId: "int-1", applicationId: "app-1", stage: null });
  });

  it("schedules once when two confirmations race", async () => {
    vi.mocked(prisma.interviewProposal.updateMany).mockResolvedValueOnce({ count: 0 } as any);

    await expect(confirmInterviewProposal(actor, "prop-1")).rejects.toThrow(
      "Proposta non trovata o già gestita",
    );
    expect(scheduleInterview).not.toHaveBeenCalled();
  });

  it("refuses a proposal already handled", async () => {
    vi.mocked(prisma.interviewProposal.findUnique).mockResolvedValueOnce({
      status: "scheduled",
      payload,
    } as any);

    await expect(confirmInterviewProposal(actor, "prop-1")).rejects.toThrow(
      "Proposta non trovata o già gestita",
    );
  });

  it("releases the claim when scheduling fails", async () => {
    vi.mocked(scheduleInterview).mockRejectedValueOnce(new Error("Candidatura non trovata o chiusa"));

    await expect(confirmInterviewProposal(actor, "prop-1")).rejects.toThrow(
      "Candidatura non trovata o chiusa",
    );
    expect(prisma.interviewProposal.update).toHaveBeenCalledWith({
      where: { id: "prop-1" },
      data: { status: "pending", handledAt: null, handledBy: null },
    });
  });
});

describe("discardInterviewProposal", () => {
  it("closes a pending proposal without scheduling", async () => {
    vi.mocked(prisma.interviewProposal.findUnique).mockResolvedValueOnce({
      applicationId: "app-1",
      status: "pending",
    } as any);

    const result = await discardInterviewProposal(actor, "prop-1");

    expect(result).toEqual({ applicationId: "app-1" });
    expect(prisma.interviewProposal.updateMany).toHaveBeenCalledWith({
      where: { id: "prop-1", status: "pending" },
      data: expect.objectContaining({ status: "discarded", handledBy: "u1" }),
    });
    expect(scheduleInterview).not.toHaveBeenCalled();
  });

  it("refuses a proposal already scheduled or discarded", async () => {
    vi.mocked(prisma.interviewProposal.findUnique).mockResolvedValueOnce({
      applicationId: "app-1",
      status: "scheduled",
    } as any);

    await expect(discardInterviewProposal(actor, "prop-1")).rejects.toThrow(
      "Proposta non trovata o già gestita",
    );
  });
});
