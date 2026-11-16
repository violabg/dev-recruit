import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    application: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    assessment: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    evaluation: { findFirst: vi.fn() },
    position: { findMany: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
import {
  advanceApplicationStage,
  applicationHasEvidence,
  setApplicationStage,
  syncCandidateApplications,
} from "@/lib/services/applications";

// The service accepts the client or a transaction client: the mock plays both
const client = prisma as any;

const application = (overrides: Record<string, unknown> = {}) => ({
  id: "app1",
  candidateId: "cand1",
  positionId: "pos1",
  stage: "applied",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.application.update).mockResolvedValue({} as any);
  vi.mocked(prisma.assessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.assessment.updateMany).mockResolvedValue({ count: 0 } as any);
});

describe("setApplicationStage", () => {
  it("rejects a missing application", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(null);

    await expect(setApplicationStage(client, "nope", "screening")).rejects.toThrow(
      "Candidatura non trovata",
    );
  });

  it("writes nothing when the stage is the same", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application({ stage: "screening" }) as any,
    );

    const result = await setApplicationStage(client, "app1", "screening");

    expect(result).toEqual({
      applicationId: "app1",
      candidateId: "cand1",
      positionId: "pos1",
      previousStage: "screening",
      stage: "screening",
      changed: false,
      cancelledAssessmentIds: [],
    });
    expect(prisma.application.update).not.toHaveBeenCalled();
  });

  it("writes the stage and the time of the change", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application() as any,
    );

    const result = await setApplicationStage(client, "app1", "interview");

    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: "app1" },
      data: { stage: "interview", stageChangedAt: expect.any(Date) },
    });
    expect(result).toMatchObject({
      previousStage: "applied",
      stage: "interview",
      changed: true,
      cancelledAssessmentIds: [],
    });
    expect(prisma.assessment.findMany).not.toHaveBeenCalled();
  });

  it("cancels the open tests when withdrawn, never deleting any", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application({ stage: "assessment" }) as any,
    );
    vi.mocked(prisma.assessment.findMany).mockResolvedValueOnce([
      { id: "t-pending" },
      { id: "t-running" },
    ] as any);

    const result = await setApplicationStage(client, "app1", "withdrawn");

    expect(prisma.assessment.findMany).toHaveBeenCalledWith({
      where: {
        applicationId: "app1",
        status: { in: ["pending", "in_progress"] },
      },
      select: { id: true },
    });
    expect(prisma.assessment.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["t-pending", "t-running"] } },
      data: { status: "cancelled" },
    });
    expect(prisma.assessment.delete).not.toHaveBeenCalled();
    expect(prisma.assessment.deleteMany).not.toHaveBeenCalled();
    expect(result.cancelledAssessmentIds).toEqual(["t-pending", "t-running"]);
  });

  it("withdraws without writing tests when none is open", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application() as any,
    );

    const result = await setApplicationStage(client, "app1", "withdrawn");

    expect(prisma.assessment.updateMany).not.toHaveBeenCalled();
    expect(result.cancelledAssessmentIds).toEqual([]);
  });
});

describe("advanceApplicationStage", () => {
  it("rejects a missing application", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(null);

    await expect(
      advanceApplicationStage(client, "nope", "cv_evaluated"),
    ).rejects.toThrow("Candidatura non trovata");
  });

  it("moves forward when the rules advance the stage", async () => {
    vi.mocked(prisma.application.findUnique)
      .mockResolvedValueOnce(application() as any)
      .mockResolvedValueOnce(application() as any);

    const result = await advanceApplicationStage(client, "app1", "assessment_sent");

    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: "app1" },
      data: { stage: "assessment", stageChangedAt: expect.any(Date) },
    });
    expect(result).toMatchObject({ stage: "assessment", changed: true });
  });

  it("never moves backwards", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application({ stage: "interview" }) as any,
    );

    const result = await advanceApplicationStage(client, "app1", "cv_evaluated");

    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      previousStage: "interview",
      stage: "interview",
      changed: false,
      cancelledAssessmentIds: [],
    });
  });

  it("never touches a closed application", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application({ stage: "rejected" }) as any,
    );

    const result = await advanceApplicationStage(client, "app1", "assessment_sent");

    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(result.changed).toBe(false);
  });
});

describe("applicationHasEvidence", () => {
  const target = { id: "app1", candidateId: "cand1", positionId: "pos1" };

  it("is true with a test", async () => {
    vi.mocked(prisma.assessment.count).mockResolvedValueOnce(1);

    await expect(applicationHasEvidence(client, target)).resolves.toBe(true);
    expect(prisma.assessment.count).toHaveBeenCalledWith({
      where: { applicationId: "app1" },
    });
  });

  it("is true with a resume evaluation", async () => {
    vi.mocked(prisma.assessment.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.evaluation.findFirst).mockResolvedValueOnce({
      id: "e1",
    } as any);

    await expect(applicationHasEvidence(client, target)).resolves.toBe(true);
    expect(prisma.evaluation.findFirst).toHaveBeenCalledWith({
      where: { candidateId: "cand1", positionId: "pos1", assessmentId: null },
      select: { id: true },
    });
  });

  it("is false without evidence", async () => {
    vi.mocked(prisma.assessment.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.evaluation.findFirst).mockResolvedValueOnce(null);

    await expect(applicationHasEvidence(client, target)).resolves.toBe(false);
  });
});

describe("syncCandidateApplications", () => {
  const input = (positionIds: string[]) => ({
    candidateId: "cand1",
    positionIds,
    ownerId: "user-123",
  });

  const existing = (positionId: string, stage: string, id = `app-${positionId}`) =>
    application({ id, positionId, stage });

  const positionsExist = (ids: string[]) =>
    vi
      .mocked(prisma.position.findMany)
      .mockResolvedValueOnce(ids.map((id) => ({ id })) as any);

  it("refuses an unknown position and writes nothing", async () => {
    positionsExist(["p1"]);

    await expect(
      syncCandidateApplications(client, input(["p1", "missing"])),
    ).rejects.toThrow("Una o più posizioni selezionate non sono valide");
    expect(prisma.application.findMany).not.toHaveBeenCalled();
    expect(prisma.application.create).not.toHaveBeenCalled();
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(prisma.application.delete).not.toHaveBeenCalled();
  });

  it("creates a new position with the owner, in the default stage", async () => {
    positionsExist(["p1"]);
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.application.create).mockResolvedValueOnce({
      id: "app-new",
    } as any);

    const result = await syncCandidateApplications(client, input(["p1"]));

    expect(prisma.application.create).toHaveBeenCalledWith({
      data: { candidateId: "cand1", positionId: "p1", ownerId: "user-123" },
      select: { id: true },
    });
    expect(result).toEqual({
      createdPositionIds: ["p1"],
      reopenedPositionIds: [],
      withdrawnPositionIds: [],
      deletedPositionIds: [],
      unchangedPositionIds: [],
      cancelledAssessmentIds: [],
      touchedApplicationIds: ["app-new"],
    });
  });

  it("leaves an unchanged position untouched", async () => {
    positionsExist(["p1"]);
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
      existing("p1", "interview"),
    ] as any);

    const result = await syncCandidateApplications(client, input(["p1"]));

    expect(prisma.application.create).not.toHaveBeenCalled();
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(prisma.application.delete).not.toHaveBeenCalled();
    expect(result.unchangedPositionIds).toEqual(["p1"]);
    expect(result.touchedApplicationIds).toEqual([]);
  });

  it("deletes a removed application without evidence", async () => {
    positionsExist(["p1"]);
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
      existing("p1", "applied"),
      existing("p2", "screening"),
    ] as any);
    vi.mocked(prisma.assessment.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.evaluation.findFirst).mockResolvedValueOnce(null);

    const result = await syncCandidateApplications(client, input(["p1"]));

    expect(prisma.application.delete).toHaveBeenCalledWith({
      where: { id: "app-p2" },
    });
    expect(result.deletedPositionIds).toEqual(["p2"]);
    expect(result.withdrawnPositionIds).toEqual([]);
  });

  it("withdraws a removed application with evidence and reports cancelled tests", async () => {
    positionsExist(["p1"]);
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
      existing("p1", "applied"),
      existing("p2", "assessment"),
    ] as any);
    vi.mocked(prisma.assessment.count).mockResolvedValueOnce(2);
    // setApplicationStage loads the application again
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      existing("p2", "assessment") as any,
    );
    vi.mocked(prisma.assessment.findMany).mockResolvedValueOnce([
      { id: "t-open" },
    ] as any);

    const result = await syncCandidateApplications(client, input(["p1"]));

    expect(prisma.application.delete).not.toHaveBeenCalled();
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: "app-p2" },
      data: { stage: "withdrawn", stageChangedAt: expect.any(Date) },
    });
    expect(result).toMatchObject({
      withdrawnPositionIds: ["p2"],
      deletedPositionIds: [],
      unchangedPositionIds: ["p1"],
      cancelledAssessmentIds: ["t-open"],
      touchedApplicationIds: ["app-p2"],
    });
  });

  it("reopens a withdrawn application selected again", async () => {
    positionsExist(["p1"]);
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
      existing("p1", "withdrawn"),
    ] as any);
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      existing("p1", "withdrawn") as any,
    );

    const result = await syncCandidateApplications(client, input(["p1"]));

    expect(prisma.application.create).not.toHaveBeenCalled();
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: "app-p1" },
      data: { stage: "applied", stageChangedAt: expect.any(Date) },
    });
    expect(result.reopenedPositionIds).toEqual(["p1"]);
    expect(result.touchedApplicationIds).toEqual(["app-p1"]);
  });

  it("leaves a withdrawn application that is not selected untouched", async () => {
    positionsExist(["p1"]);
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
      existing("p1", "applied"),
      existing("p2", "withdrawn"),
    ] as any);

    const result = await syncCandidateApplications(client, input(["p1"]));

    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(prisma.application.delete).not.toHaveBeenCalled();
    expect(prisma.assessment.count).not.toHaveBeenCalled();
    expect(result).toEqual({
      createdPositionIds: [],
      reopenedPositionIds: [],
      withdrawnPositionIds: [],
      deletedPositionIds: [],
      unchangedPositionIds: ["p1"],
      cancelledAssessmentIds: [],
      touchedApplicationIds: [],
    });
  });
});
