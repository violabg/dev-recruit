import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/application-decisions", () => ({
  loadApplicationDecision: vi.fn(),
  recordApplicationDecision: vi.fn(),
}));

vi.mock("@/lib/services/ai/decision-review", () => ({
  generateDecisionChallenge: vi.fn(),
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateCandidateCache: vi.fn(),
  invalidateEvaluationCache: vi.fn(),
  invalidateInterviewCache: vi.fn(),
  invalidateAssessmentCache: vi.fn(),
  invalidateScorecardCache: vi.fn(),
}));

import {
  challengeDecisionAction,
  recordApplicationDecisionAction,
} from "@/lib/actions/application-decisions";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { generateDecisionChallenge } from "@/lib/services/ai/decision-review";
import {
  loadApplicationDecision,
  recordApplicationDecision,
  type ApplicationDecision,
} from "@/lib/services/application-decisions";
import { UserError } from "@/lib/services/user-error";
import * as cacheUtils from "@/lib/utils/cache-utils";
import { invalidateCandidateCache } from "@/lib/utils/cache-utils";

const RATIONALE = "Ottimo profilo tecnico";

const decision = (
  overrides: Partial<ApplicationDecision> = {},
): ApplicationDecision => ({
  id: "app-1",
  stage: "decision",
  candidateId: "cand-1",
  positionId: "pos-1",
  candidate: { id: "cand-1", firstName: "Mario", lastName: "Rossi" },
  position: { id: "pos-1", title: "Sviluppatore" },
  recorded: {
    outcome: null,
    rationale: null,
    decidedAt: null,
    decidedBy: null,
    weights: null,
  },
  criteria: [
    {
      id: "c1",
      name: "React",
      category: "technical",
      priority: "must",
      expectedLevel: 3,
      weight: 2,
      archived: false,
      order: 0,
    },
  ],
  sources: [
    {
      criterionId: "c1",
      cv: { score: 4, evidence: "" },
      test: null,
      interviewers: [],
    },
  ],
  cv: null,
  test: null,
  interviews: [],
  legacy: { rubric: null, hiringNotes: null },
  ...overrides,
});

const expectNoInvalidation = () => {
  for (const helper of Object.values(cacheUtils)) {
    if (vi.isMockFunction(helper)) {
      expect(helper).not.toHaveBeenCalled();
    }
  }
};

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
  vi.mocked(recordApplicationDecision).mockResolvedValue({
    applicationId: "app-1",
    candidateId: "cand-1",
    positionId: "pos-1",
    stage: "offer",
    changed: true,
  });
  vi.mocked(generateDecisionChallenge).mockResolvedValue({
    reasons: [{ title: "Motivo", explanation: "Perché", criterionIds: ["c1"] }],
  });
});

describe("recordApplicationDecisionAction", () => {
  const input = {
    applicationId: "app-1",
    outcome: "offer" as const,
    rationale: RATIONALE,
  };

  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    expect(await recordApplicationDecisionAction(input)).toEqual({
      success: false,
      error: "Sessione scaduta. Accedi di nuovo per continuare.",
    });
    expect(recordApplicationDecision).not.toHaveBeenCalled();
  });

  it("refuses a rationale shorter than 10 characters", async () => {
    expect(
      await recordApplicationDecisionAction({ ...input, rationale: "breve" }),
    ).toEqual({
      success: false,
      error: "La motivazione deve avere almeno 10 caratteri",
    });
    expect(recordApplicationDecision).not.toHaveBeenCalled();
  });

  it("refuses an outcome that is not offer, hired or rejected", async () => {
    expect(
      await recordApplicationDecisionAction({
        ...input,
        outcome: "decision" as any,
      }),
    ).toEqual({ success: false, error: "Esito della decisione non valido" });
  });

  it("records with the session user, invalidates the candidate cache and returns the stage", async () => {
    const result = await recordApplicationDecisionAction({
      ...input,
      rationale: `  ${RATIONALE}  `,
      decidedBy: "someone-else",
    } as any);

    expect(result).toEqual({ success: true, stage: "offer" });
    expect(recordApplicationDecision).toHaveBeenCalledWith({
      applicationId: "app-1",
      outcome: "offer",
      rationale: RATIONALE,
      userId: "user-123",
    });
    expect(invalidateCandidateCache).toHaveBeenCalledWith({
      candidateId: "cand-1",
      positionId: "pos-1",
      applicationId: "app-1",
    });
  });

  it("returns the service UserError as the error", async () => {
    vi.mocked(recordApplicationDecision).mockRejectedValueOnce(
      new UserError("Candidatura chiusa: riaprila per registrare la decisione"),
    );

    expect(await recordApplicationDecisionAction(input)).toEqual({
      success: false,
      error: "Candidatura chiusa: riaprila per registrare la decisione",
    });
    expect(invalidateCandidateCache).not.toHaveBeenCalled();
  });
});

describe("challengeDecisionAction", () => {
  const input = { applicationId: "app-1", outcome: "rejected" as const };

  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    expect(await challengeDecisionAction(input)).toMatchObject({
      success: false,
    });
    expect(loadApplicationDecision).not.toHaveBeenCalled();
  });

  it("reports a missing application", async () => {
    vi.mocked(loadApplicationDecision).mockResolvedValueOnce(null);

    expect(await challengeDecisionAction(input)).toEqual({
      success: false,
      error: "Candidatura non trovata",
    });
  });

  it("refuses a position without scorecard criteria", async () => {
    vi.mocked(loadApplicationDecision).mockResolvedValueOnce(
      decision({ criteria: [], sources: [] }),
    );

    expect(await challengeDecisionAction(input)).toEqual({
      success: false,
      error: "Crea prima la scheda di valutazione della posizione",
    });
    expect(generateDecisionChallenge).not.toHaveBeenCalled();
  });

  it("returns the challenge, writes nothing and invalidates nothing", async () => {
    const model = decision();
    vi.mocked(loadApplicationDecision).mockResolvedValueOnce(model);

    const result = await challengeDecisionAction({
      ...input,
      rationale: "Troppo junior",
      specificModel: "some/model",
    });

    expect(result).toEqual({
      success: true,
      challenge: {
        reasons: [
          { title: "Motivo", explanation: "Perché", criterionIds: ["c1"] },
        ],
      },
    });
    expect(loadApplicationDecision).toHaveBeenCalledWith(prisma, "app-1");
    expect(generateDecisionChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: model,
        outcome: "rejected",
        rationale: "Troppo junior",
        specificModel: "some/model",
      }),
    );
    expect(recordApplicationDecision).not.toHaveBeenCalled();
    expect(prisma.application.update).not.toHaveBeenCalled();
    expectNoInvalidation();
  });

  it("uses the live weights of an undecided application, even with stored weights", async () => {
    vi.mocked(loadApplicationDecision).mockResolvedValueOnce(
      decision({
        recorded: {
          outcome: null,
          rationale: null,
          decidedAt: null,
          decidedBy: null,
          weights: { c1: 5 },
        },
      }),
    );

    await challengeDecisionAction(input);

    const { score } = vi.mocked(generateDecisionChallenge).mock.calls[0][0];
    expect(score.weightsSource).toBe("scorecard");
    expect(score.rows[0].weight).toBe(2);
  });

  it("uses the stored weights of a decided application", async () => {
    vi.mocked(loadApplicationDecision).mockResolvedValueOnce(
      decision({
        recorded: {
          outcome: "offer",
          rationale: RATIONALE,
          decidedAt: new Date(),
          decidedBy: { id: "u-1", name: "Laura" },
          weights: { c1: 5 },
        },
      }),
    );

    await challengeDecisionAction(input);

    const { score } = vi.mocked(generateDecisionChallenge).mock.calls[0][0];
    expect(score.weightsSource).toBe("decision");
    expect(score.rows[0].weight).toBe(5);
  });
});
