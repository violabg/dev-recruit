import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    position: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    scorecard: { upsert: vi.fn(), update: vi.fn(), create: vi.fn() },
    scorecardCriterion: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/services/scorecards", () => ({
  getActiveCriteria: vi.fn(),
  saveScorecard: vi.fn(),
  FOREIGN_CRITERIA_MESSAGE:
    "Uno o più criteri non appartengono a questa posizione",
}));

vi.mock("@/lib/services/ai/scorecard-generation", () => ({
  generateScorecardCriteria: vi.fn(),
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateScorecardCache: vi.fn(),
  invalidateInterviewGuideCache: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
}));

import {
  generateScorecardCriteriaAction,
  saveScorecardAction,
} from "@/lib/actions/scorecards";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { generateScorecardCriteria } from "@/lib/services/ai/scorecard-generation";
import { getActiveCriteria, saveScorecard } from "@/lib/services/scorecards";
import {
  invalidateInterviewGuideCache,
  invalidateScorecardCache,
} from "@/lib/utils/cache-utils";

const criterion = (overrides: Record<string, unknown> = {}) => ({
  name: "React",
  description: "",
  category: "technical",
  priority: "must",
  weight: 3,
  expectedLevel: 3,
  anchors: { weak: "", medium: "", strong: "" },
  source: "skill",
  ...overrides,
});

const active = (id: string, name: string) => ({
  id,
  name,
  description: null,
  category: "technical" as const,
  priority: "must" as const,
  weight: 3,
  expectedLevel: 3,
});

const saved = {
  scorecardId: "sc-1",
  created: 1,
  updated: 1,
  deleted: 0,
  archived: 0,
  guidesUnlinked: false,
};

const EXPIRED = "Sessione scaduta. Accedi di nuovo per continuare.";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
  vi.mocked(prisma.position.findUnique).mockResolvedValue({
    id: "pos-1",
    title: "Frontend Developer",
    experienceLevel: "senior",
    skills: ["React"],
    softSkills: ["Comunicazione"],
    description: null,
  } as any);
  vi.mocked(prisma.$transaction).mockImplementation(((fn: (tx: unknown) => unknown) =>
    fn(prisma)) as any);
  vi.mocked(getActiveCriteria).mockResolvedValue([active("c-1", "React")]);
  vi.mocked(saveScorecard).mockResolvedValue(saved);
});

describe("saveScorecardAction", () => {
  const input = {
    positionId: "pos-1",
    criteria: [criterion({ id: "c-1" }), criterion({ name: "Node" })],
  };

  it("returns the expired-session result without a session", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await saveScorecardAction(input as any);

    expect(result).toEqual({ success: false, error: EXPIRED });
    expect(saveScorecard).not.toHaveBeenCalled();
  });

  it("refuses a missing position", async () => {
    vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

    const result = await saveScorecardAction(input as any);

    expect(result).toEqual({ success: false, error: "Posizione non trovata" });
    expect(saveScorecard).not.toHaveBeenCalled();
  });

  it("refuses a criterion id that is not an active criterion of this scorecard", async () => {
    const result = await saveScorecardAction({
      positionId: "pos-1",
      criteria: [criterion({ id: "c-other" })],
    } as any);

    expect(result).toEqual({
      success: false,
      error: "Uno o più criteri non appartengono a questa posizione",
    });
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(invalidateScorecardCache).not.toHaveBeenCalled();
  });

  it("refuses an invalid criterion with the schema message", async () => {
    const result = await saveScorecardAction({
      positionId: "pos-1",
      criteria: [criterion({ weight: 6 })],
    } as any);

    expect(result).toEqual({ success: false, error: "Il peso massimo è 5" });
  });

  it("saves in a transaction and invalidates the scorecard cache", async () => {
    const result = await saveScorecardAction(input as any);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(saveScorecard).toHaveBeenCalledWith(prisma, {
      positionId: "pos-1",
      criteria: input.criteria,
      userId: "user-123",
    });
    expect(invalidateScorecardCache).toHaveBeenCalledWith({
      positionId: "pos-1",
    });
    expect(invalidateInterviewGuideCache).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      scorecardId: "sc-1",
      created: 1,
      updated: 1,
      deleted: 0,
      archived: 0,
    });
  });

  it("also invalidates the guides when a deleted criterion was unlinked from them", async () => {
    vi.mocked(saveScorecard).mockResolvedValueOnce({
      ...saved,
      deleted: 1,
      guidesUnlinked: true,
    });

    await saveScorecardAction(input as any);

    expect(invalidateScorecardCache).toHaveBeenCalledWith({
      positionId: "pos-1",
    });
    expect(invalidateInterviewGuideCache).toHaveBeenCalledWith({
      positionId: "pos-1",
    });
  });

  it("applies no ownership check: any signed-in user saves any scorecard", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({ id: "someone-else" } as any);

    const result = await saveScorecardAction(input as any);

    expect(result.success).toBe(true);
  });
});

describe("generateScorecardCriteriaAction", () => {
  const proposal = [criterion({ name: "TypeScript" })];

  beforeEach(() => {
    vi.mocked(generateScorecardCriteria).mockResolvedValue({
      criteria: proposal as any,
    });
  });

  it("returns the expired-session result without a session", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await generateScorecardCriteriaAction({ positionId: "pos-1" });

    expect(result).toEqual({ success: false, error: EXPIRED });
    expect(generateScorecardCriteria).not.toHaveBeenCalled();
  });

  it("refuses a missing position", async () => {
    vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

    const result = await generateScorecardCriteriaAction({ positionId: "pos-1" });

    expect(result).toEqual({ success: false, error: "Posizione non trovata" });
  });

  it("returns the proposal built from the position, with the existing names", async () => {
    const result = await generateScorecardCriteriaAction({
      positionId: "pos-1",
      specificModel: "openai/gpt-oss-20b",
    });

    expect(generateScorecardCriteria).toHaveBeenCalledWith({
      positionTitle: "Frontend Developer",
      experienceLevel: "senior",
      skills: ["React"],
      softSkills: ["Comunicazione"],
      description: undefined,
      existingNames: ["react"],
      specificModel: "openai/gpt-oss-20b",
    });
    expect(result).toEqual({ success: true, criteria: proposal });
  });

  it("writes nothing and invalidates nothing", async () => {
    await generateScorecardCriteriaAction({ positionId: "pos-1" });

    expect(invalidateScorecardCache).not.toHaveBeenCalled();
    expect(invalidateInterviewGuideCache).not.toHaveBeenCalled();
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    for (const write of [
      prisma.position.update,
      prisma.position.create,
      prisma.scorecard.upsert,
      prisma.scorecard.update,
      prisma.scorecard.create,
      prisma.scorecardCriterion.create,
      prisma.scorecardCriterion.update,
      prisma.scorecardCriterion.delete,
    ]) {
      expect(write).not.toHaveBeenCalled();
    }
  });
});
