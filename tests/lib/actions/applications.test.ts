import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => {
  const prismaMock: Record<string, unknown> = {
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
  };
  // The transaction callback receives the same mock
  prismaMock.$transaction = vi.fn((fn: (tx: unknown) => unknown) =>
    fn(prismaMock),
  );
  return { default: prismaMock };
});

// Only the association service is stubbed: setApplicationStage stays real
vi.mock("@/lib/services/applications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/services/applications")>()),
  addCandidatesToPosition: vi.fn(),
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateCandidateCache: vi.fn(),
  invalidateAssessmentCache: vi.fn(),
  invalidateInterviewCache: vi.fn(),
}));

import {
  addCandidatesToPositionAction,
  moveApplicationStageAction,
  setApplicationOwnerAction,
} from "@/lib/actions/applications";
import { UserError } from "@/lib/actions/run-action";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { addCandidatesToPosition } from "@/lib/services/applications";
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

describe("addCandidatesToPositionAction", () => {
  const serviceResult = (overrides: Record<string, unknown> = {}) => ({
    positionId: "pos1",
    createdCandidateIds: [],
    reopenedCandidateIds: [],
    unchangedCandidateIds: [],
    touchedApplicationIds: [],
    ...overrides,
  });

  it("requires a signed-in user and calls nothing", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await addCandidatesToPositionAction({
      positionId: "pos1",
      candidateIds: ["cand1"],
    });

    expect(result).toEqual({
      success: false,
      error: "Sessione scaduta. Accedi di nuovo per continuare.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(addCandidatesToPosition).not.toHaveBeenCalled();
  });

  it("refuses an empty selection", async () => {
    const result = await addCandidatesToPositionAction({
      positionId: "pos1",
      candidateIds: [],
    });

    expect(result).toEqual({
      success: false,
      error: "Seleziona almeno un candidato.",
    });
    expect(addCandidatesToPosition).not.toHaveBeenCalled();
  });

  it("associates in one transaction, owned by the user, and refreshes each touched candidate", async () => {
    vi.mocked(addCandidatesToPosition).mockResolvedValueOnce(
      serviceResult({
        createdCandidateIds: ["c-new"],
        reopenedCandidateIds: ["c-reopen"],
        unchangedCandidateIds: ["c-same"],
        touchedApplicationIds: ["app-new", "app-w"],
      }) as any,
    );

    const result = await addCandidatesToPositionAction({
      positionId: "pos1",
      candidateIds: ["c-new", "c-reopen", "c-same"],
    });

    expect(result).toEqual({
      success: true,
      createdCount: 1,
      reopenedCount: 1,
      unchangedCount: 1,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(addCandidatesToPosition).toHaveBeenCalledWith(prisma, {
      positionId: "pos1",
      candidateIds: ["c-new", "c-reopen", "c-same"],
      ownerId: "user-123",
    });
    expect(invalidateCandidateCache).toHaveBeenCalledTimes(2);
    expect(invalidateCandidateCache).toHaveBeenCalledWith({
      candidateId: "c-new",
      positionId: "pos1",
      applicationIds: ["app-new", "app-w"],
    });
    expect(invalidateCandidateCache).toHaveBeenCalledWith({
      candidateId: "c-reopen",
      positionId: "pos1",
      applicationIds: ["app-new", "app-w"],
    });
  });

  it("refreshes nothing when every candidate was already in selection", async () => {
    vi.mocked(addCandidatesToPosition).mockResolvedValueOnce(
      serviceResult({ unchangedCandidateIds: ["c1", "c2"] }) as any,
    );

    const result = await addCandidatesToPositionAction({
      positionId: "pos1",
      candidateIds: ["c1", "c2"],
    });

    expect(result).toEqual({
      success: true,
      createdCount: 0,
      reopenedCount: 0,
      unchangedCount: 2,
    });
    expect(invalidateCandidateCache).not.toHaveBeenCalled();
  });

  it("returns the service refusal as an Italian error", async () => {
    vi.mocked(addCandidatesToPosition).mockRejectedValueOnce(
      new UserError("Puoi associare candidati solo a una posizione aperta"),
    );

    const result = await addCandidatesToPositionAction({
      positionId: "pos1",
      candidateIds: ["cand1"],
    });

    expect(result).toEqual({
      success: false,
      error: "Puoi associare candidati solo a una posizione aperta",
    });
    expect(invalidateCandidateCache).not.toHaveBeenCalled();
  });
});
