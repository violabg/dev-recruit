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
    interview: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    position: { findMany: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
import {
  addCandidatesToPosition,
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
      cancelledInterviewIds: [],
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

  it("cancels only the scheduled interviews when withdrawn", async () => {
    const db = prisma as any;
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application({ stage: "interview" }) as any,
    );
    db.interview.findMany.mockResolvedValueOnce([{ id: "int-sched" }]);

    const result = await setApplicationStage(client, "app1", "withdrawn");

    expect(db.interview.findMany).toHaveBeenCalledWith({
      where: { applicationId: "app1", status: "scheduled" },
      select: { id: true },
    });
    expect(db.interview.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["int-sched"] } },
      data: { status: "cancelled" },
    });
    expect(result.cancelledInterviewIds).toEqual(["int-sched"]);
  });

  it("writes no interview when none is scheduled", async () => {
    const db = prisma as any;
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application({ stage: "interview" }) as any,
    );

    const result = await setApplicationStage(client, "app1", "withdrawn");

    expect(db.interview.updateMany).not.toHaveBeenCalled();
    expect(result.cancelledInterviewIds).toEqual([]);
  });

  it("never cancels interviews when rejected", async () => {
    const db = prisma as any;
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      application({ stage: "interview" }) as any,
    );

    const result = await setApplicationStage(client, "app1", "rejected");

    expect(db.interview.findMany).not.toHaveBeenCalled();
    expect(db.interview.updateMany).not.toHaveBeenCalled();
    expect(result.cancelledInterviewIds).toEqual([]);
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

  it("is true with only an interview, of any status", async () => {
    const db = prisma as any;
    vi.mocked(prisma.assessment.count).mockResolvedValueOnce(0);
    db.interview.count.mockResolvedValueOnce(1);

    await expect(applicationHasEvidence(client, target)).resolves.toBe(true);
    expect(db.interview.count).toHaveBeenCalledWith({
      where: { applicationId: "app1" },
    });
    expect(prisma.evaluation.findFirst).not.toHaveBeenCalled();
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
      cancelledInterviewIds: [],
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

  it("withdraws (never deletes) a removed application with only an interview, cancelling it", async () => {
    const db = prisma as any;
    positionsExist(["p1"]);
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
      existing("p1", "applied"),
      existing("p2", "interview"),
    ] as any);
    vi.mocked(prisma.assessment.count).mockResolvedValueOnce(0);
    db.interview.count.mockResolvedValueOnce(1);
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(
      existing("p2", "interview") as any,
    );
    db.interview.findMany.mockResolvedValueOnce([{ id: "int-1" }]);

    const result = await syncCandidateApplications(client, input(["p1"]));

    expect(prisma.application.delete).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      withdrawnPositionIds: ["p2"],
      deletedPositionIds: [],
      cancelledInterviewIds: ["int-1"],
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
      cancelledInterviewIds: [],
      touchedApplicationIds: [],
    });
  });
});

describe("addCandidatesToPosition", () => {
  type TxApplication = { id: string; positionId: string; stage: string };

  // Hand-built transaction client: every delegate the service and
  // setApplicationStage can reach, plus the ones that must never be written
  const makeTx = () => ({
    position: { findUnique: vi.fn() },
    candidate: { findMany: vi.fn() },
    application: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(async () => ({})),
      delete: vi.fn(),
    },
    assessment: {
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    interview: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
  });

  let tx: ReturnType<typeof makeTx>;

  const input = (candidateIds: string[]) => ({
    positionId: "pos1",
    candidateIds,
    ownerId: "user-123",
  });

  const candidate = (
    id: string,
    applications: TxApplication[] = [],
    firstName = "Mario",
    lastName = "Rossi",
  ) => ({ id, firstName, lastName, applications });

  const activeElsewhere = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `app-other-${i}`,
      positionId: `other-${i}`,
      stage: "screening",
    }));

  const openPosition = () =>
    tx.position.findUnique.mockResolvedValueOnce({ id: "pos1", status: "open" });

  const expectNothingWritten = () => {
    expect(tx.application.create).not.toHaveBeenCalled();
    expect(tx.application.update).not.toHaveBeenCalled();
    expect(tx.application.delete).not.toHaveBeenCalled();
    expect(tx.assessment.updateMany).not.toHaveBeenCalled();
    expect(tx.interview.updateMany).not.toHaveBeenCalled();
  };

  const run = (ids: string[]) =>
    addCandidatesToPosition(tx as any, input(ids));

  beforeEach(() => {
    tx = makeTx();
  });

  it("refuses a draft position and writes nothing", async () => {
    tx.position.findUnique.mockResolvedValueOnce({ id: "pos1", status: "draft" });

    await expect(run(["cand1"])).rejects.toThrow(
      "Puoi associare candidati solo a una posizione aperta",
    );
    expect(tx.position.findUnique).toHaveBeenCalledWith({
      where: { id: "pos1" },
      select: { id: true, status: true },
    });
    expect(tx.candidate.findMany).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("refuses a closed position and writes nothing", async () => {
    tx.position.findUnique.mockResolvedValueOnce({ id: "pos1", status: "closed" });

    await expect(run(["cand1"])).rejects.toThrow(
      "Puoi associare candidati solo a una posizione aperta",
    );
    expectNothingWritten();
  });

  it("refuses a missing position with the same message", async () => {
    tx.position.findUnique.mockResolvedValueOnce(null);

    await expect(run(["cand1"])).rejects.toThrow(
      "Puoi associare candidati solo a una posizione aperta",
    );
    expect(tx.candidate.findMany).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("refuses an unknown candidate and writes nothing", async () => {
    openPosition();
    tx.candidate.findMany.mockResolvedValueOnce([candidate("cand1")]);

    await expect(run(["cand1", "missing"])).rejects.toThrow(
      "Uno o più candidati selezionati non esistono",
    );
    expectNothingWritten();
  });

  it("creates an application in the default stage owned by the user", async () => {
    openPosition();
    tx.candidate.findMany.mockResolvedValueOnce([candidate("cand1")]);
    tx.application.create.mockResolvedValueOnce({ id: "app-new" });

    const result = await run(["cand1"]);

    expect(tx.candidate.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["cand1"] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        applications: { select: { id: true, positionId: true, stage: true } },
      },
    });
    expect(tx.application.create).toHaveBeenCalledWith({
      data: { candidateId: "cand1", positionId: "pos1", ownerId: "user-123" },
      select: { id: true },
    });
    expect(tx.application.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      positionId: "pos1",
      createdCandidateIds: ["cand1"],
      reopenedCandidateIds: [],
      unchangedCandidateIds: [],
      touchedApplicationIds: ["app-new"],
    });
  });

  it("reopens a withdrawn application at applied and gives it to the user", async () => {
    openPosition();
    tx.candidate.findMany.mockResolvedValueOnce([
      candidate("cand1", [
        { id: "app-w", positionId: "pos1", stage: "withdrawn" },
      ]),
    ]);
    tx.application.findUnique.mockResolvedValueOnce({
      id: "app-w",
      candidateId: "cand1",
      positionId: "pos1",
      stage: "withdrawn",
    });

    const result = await run(["cand1"]);

    expect(tx.application.create).not.toHaveBeenCalled();
    expect(tx.application.update).toHaveBeenCalledWith({
      where: { id: "app-w" },
      data: { stage: "applied", stageChangedAt: expect.any(Date) },
    });
    expect(tx.application.update).toHaveBeenCalledWith({
      where: { id: "app-w" },
      data: { ownerId: "user-123" },
    });
    // Reopening cancels nothing
    expect(tx.assessment.updateMany).not.toHaveBeenCalled();
    expect(tx.interview.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      positionId: "pos1",
      createdCandidateIds: [],
      reopenedCandidateIds: ["cand1"],
      unchangedCandidateIds: [],
      touchedApplicationIds: ["app-w"],
    });
  });

  it("leaves a candidate already in selection untouched", async () => {
    openPosition();
    tx.candidate.findMany.mockResolvedValueOnce([
      candidate("cand1", [
        { id: "app-s", positionId: "pos1", stage: "screening" },
      ]),
    ]);

    const result = await run(["cand1"]);

    expectNothingWritten();
    expect(tx.application.findUnique).not.toHaveBeenCalled();
    expect(result).toEqual({
      positionId: "pos1",
      createdCandidateIds: [],
      reopenedCandidateIds: [],
      unchangedCandidateIds: ["cand1"],
      touchedApplicationIds: [],
    });
  });

  it("refuses a candidate with 10 active positions, naming them", async () => {
    openPosition();
    tx.candidate.findMany.mockResolvedValueOnce([
      candidate("cand1", activeElsewhere(10), "Giulia", "Verdi"),
    ]);

    await expect(run(["cand1"])).rejects.toThrow(
      "Giulia Verdi ha già 10 posizioni (massimo 10).",
    );
    expectNothingWritten();
  });

  it("refuses reopening for a candidate with 10 active positions", async () => {
    openPosition();
    tx.candidate.findMany.mockResolvedValueOnce([
      candidate(
        "cand1",
        [
          ...activeElsewhere(10),
          { id: "app-w", positionId: "pos1", stage: "withdrawn" },
        ],
        "Giulia",
        "Verdi",
      ),
    ]);

    await expect(run(["cand1"])).rejects.toThrow(
      "Giulia Verdi ha già 10 posizioni (massimo 10).",
    );
    expectNothingWritten();
  });

  it("does not count withdrawn applications toward the limit", async () => {
    openPosition();
    tx.candidate.findMany.mockResolvedValueOnce([
      candidate("cand1", [
        ...activeElsewhere(9),
        { id: "w1", positionId: "x1", stage: "withdrawn" },
        { id: "w2", positionId: "x2", stage: "withdrawn" },
        { id: "w3", positionId: "x3", stage: "withdrawn" },
      ]),
    ]);
    tx.application.create.mockResolvedValueOnce({ id: "app-new" });

    const result = await run(["cand1"]);

    expect(result.createdCandidateIds).toEqual(["cand1"]);
  });

  it("creates one application for duplicated ids", async () => {
    openPosition();
    tx.candidate.findMany.mockResolvedValueOnce([candidate("cand1")]);
    tx.application.create.mockResolvedValueOnce({ id: "app-new" });

    const result = await run(["cand1", "cand1"]);

    expect(tx.candidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["cand1"] } } }),
    );
    expect(tx.application.create).toHaveBeenCalledTimes(1);
    expect(result.createdCandidateIds).toEqual(["cand1"]);
  });

  it("handles a mixed batch in input order and never writes other positions", async () => {
    openPosition();
    tx.candidate.findMany.mockResolvedValueOnce([
      candidate("c-unchanged", [
        { id: "app-u", positionId: "pos1", stage: "interview" },
      ]),
      candidate("c-new", [
        { id: "app-elsewhere", positionId: "pos2", stage: "screening" },
      ]),
      candidate("c-reopen", [
        { id: "app-w", positionId: "pos1", stage: "withdrawn" },
        { id: "app-elsewhere-2", positionId: "pos3", stage: "withdrawn" },
      ]),
    ]);
    tx.application.create.mockResolvedValueOnce({ id: "app-new" });
    tx.application.findUnique.mockResolvedValueOnce({
      id: "app-w",
      candidateId: "c-reopen",
      positionId: "pos1",
      stage: "withdrawn",
    });

    const result = await run(["c-new", "c-reopen", "c-unchanged"]);

    expect(result).toEqual({
      positionId: "pos1",
      createdCandidateIds: ["c-new"],
      reopenedCandidateIds: ["c-reopen"],
      unchangedCandidateIds: ["c-unchanged"],
      touchedApplicationIds: ["app-new", "app-w"],
    });
    const updatedIds = tx.application.update.mock.calls.map(
      (call: any[]) => call[0].where.id,
    );
    expect(updatedIds.every((id: string) => id === "app-w")).toBe(true);
    expect(tx.application.findMany).not.toHaveBeenCalled();
    expect(tx.application.delete).not.toHaveBeenCalled();
  });
});
