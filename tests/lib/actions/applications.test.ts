import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    application: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    assessment: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    interview: {
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateCandidateCache: vi.fn(),
  invalidateAssessmentCache: vi.fn(),
  invalidateInterviewCache: vi.fn(),
}));

import {
  moveApplicationStageAction,
  setApplicationOwnerAction,
} from "@/lib/actions/applications";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import {
  invalidateAssessmentCache,
  invalidateCandidateCache,
  invalidateInterviewCache,
} from "@/lib/utils/cache-utils";

const application = (overrides: Record<string, unknown> = {}) => ({
  id: "app1",
  candidateId: "cand1",
  positionId: "pos1",
  stage: "screening",
  // Owned by someone else: ownership never limits a move
  ownerId: "someone-else",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
  vi.mocked(prisma.application.update).mockResolvedValue({} as any);
  vi.mocked(prisma.assessment.findMany).mockResolvedValue([]);
});

describe("moveApplicationStageAction", () => {
  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await moveApplicationStageAction({
      applicationId: "app1",
      stage: "interview",
    });

    expect(result).toMatchObject({ success: false });
    expect(prisma.application.findUnique).not.toHaveBeenCalled();
  });

  it("refuses an unknown stage", async () => {
    const result = await moveApplicationStageAction({
      applicationId: "app1",
      stage: "archived" as any,
    });

    expect(result).toEqual({
      success: false,
      error: "Fase della candidatura non valida",
    });
  });

  it("reports a missing application", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(null);

    const result = await moveApplicationStageAction({
      applicationId: "nope",
      stage: "interview",
    });

    expect(result).toEqual({
      success: false,
      error: "Candidatura non trovata",
    });
  });

  it("moves the stage and refreshes the candidate reads", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application() as any,
    );

    const result = await moveApplicationStageAction({
      applicationId: "app1",
      stage: "interview",
    });

    expect(result).toEqual({ success: true, stage: "interview", changed: true });
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: "app1" },
      data: { stage: "interview", stageChangedAt: expect.any(Date) },
    });
    expect(invalidateCandidateCache).toHaveBeenCalledWith({
      candidateId: "cand1",
      positionId: "pos1",
      applicationId: "app1",
    });
    expect(invalidateAssessmentCache).not.toHaveBeenCalled();
  });

  it("does nothing on the same stage", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application() as any,
    );

    const result = await moveApplicationStageAction({
      applicationId: "app1",
      stage: "screening",
    });

    expect(result).toEqual({ success: true, stage: "screening", changed: false });
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(invalidateCandidateCache).not.toHaveBeenCalled();
  });

  it("refreshes the tests when withdrawing cancels some", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application({ stage: "assessment" }) as any,
    );
    vi.mocked(prisma.assessment.findMany).mockResolvedValueOnce([
      { id: "t1" },
    ] as any);

    const result = await moveApplicationStageAction({
      applicationId: "app1",
      stage: "withdrawn",
    });

    expect(result).toEqual({ success: true, stage: "withdrawn", changed: true });
    expect(prisma.assessment.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["t1"] } },
      data: { status: "cancelled" },
    });
    expect(invalidateAssessmentCache).toHaveBeenCalled();
    expect(invalidateInterviewCache).not.toHaveBeenCalled();
  });

  it("refreshes the interviews when withdrawing cancels some", async () => {
    const db = prisma as any;
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application({ stage: "interview" }) as any,
    );
    db.interview.findMany.mockResolvedValueOnce([{ id: "int-1" }]);

    const result = await moveApplicationStageAction({
      applicationId: "app1",
      stage: "withdrawn",
    });

    expect(result).toEqual({ success: true, stage: "withdrawn", changed: true });
    expect(db.interview.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["int-1"] } },
      data: { status: "cancelled" },
    });
    expect(invalidateInterviewCache).toHaveBeenCalledWith({
      applicationId: "app1",
    });
  });

  it("reopens a rejected application", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application({ stage: "rejected" }) as any,
    );

    const result = await moveApplicationStageAction({
      applicationId: "app1",
      stage: "applied",
    });

    expect(result).toEqual({ success: true, stage: "applied", changed: true });
  });

  it("moves backwards by hand", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application({ stage: "offer" }) as any,
    );

    const result = await moveApplicationStageAction({
      applicationId: "app1",
      stage: "screening",
    });

    expect(result).toEqual({ success: true, stage: "screening", changed: true });
  });
});

describe("setApplicationOwnerAction", () => {
  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    expect(
      await setApplicationOwnerAction({ applicationId: "app1", owner: "me" }),
    ).toMatchObject({ success: false });
    expect(prisma.application.update).not.toHaveBeenCalled();
  });

  it("takes the application for the current user", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application() as any,
    );

    const result = await setApplicationOwnerAction({
      applicationId: "app1",
      owner: "me",
    });

    expect(result).toEqual({ success: true, ownerId: "user-123" });
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: "app1" },
      data: { ownerId: "user-123" },
    });
    expect(invalidateCandidateCache).toHaveBeenCalledWith({
      candidateId: "cand1",
      positionId: "pos1",
      applicationId: "app1",
    });
  });

  it("releases the application", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application({ ownerId: "user-123" }) as any,
    );

    const result = await setApplicationOwnerAction({
      applicationId: "app1",
      owner: "none",
    });

    expect(result).toEqual({ success: true, ownerId: null });
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: "app1" },
      data: { ownerId: null },
    });
  });

  it("refuses an unknown owner value", async () => {
    expect(
      await setApplicationOwnerAction({
        applicationId: "app1",
        owner: "everyone" as any,
      }),
    ).toEqual({ success: false, error: "Responsabile non valido" });
  });

  it("reports a missing application", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(null);

    expect(
      await setApplicationOwnerAction({ applicationId: "nope", owner: "me" }),
    ).toEqual({ success: false, error: "Candidatura non trovata" });
    expect(invalidateCandidateCache).not.toHaveBeenCalled();
  });
});
