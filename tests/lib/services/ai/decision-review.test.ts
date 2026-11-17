import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/ai/generate", () => ({ generateStructured: vi.fn() }));

import { aiDecisionChallengeSchema } from "@/lib/schemas";
import {
  generateDecisionChallenge,
  MAX_CHALLENGE_REASONS,
} from "@/lib/services/ai/decision-review";
import { generateStructured } from "@/lib/services/ai/generate";
import type { ApplicationDecision } from "@/lib/services/application-decisions";
import {
  computeDecisionScore,
  type DecisionCriterion,
} from "@/lib/utils/decision-score";

const criterion = (id: string, name: string): DecisionCriterion => ({
  id,
  name,
  category: "technical",
  priority: "must",
  expectedLevel: 3,
  weight: 3,
  archived: false,
  order: 0,
});

const decision: ApplicationDecision = {
  id: "app-1",
  stage: "decision",
  candidateId: "cand-1",
  positionId: "pos-1",
  candidate: { id: "cand-1", firstName: "Mariolino", lastName: "Rossignoli" },
  position: { id: "pos-1", title: "Sviluppatore React" },
  recorded: {
    outcome: null,
    rationale: null,
    decidedAt: null,
    decidedBy: null,
    weights: null,
  },
  criteria: [criterion("crit-react", "React"), criterion("crit-sql", "SQL")],
  sources: [
    {
      criterionId: "crit-react",
      cv: { score: 4, evidence: "Progetti React" },
      test: null,
      interviewers: [
        {
          feedbackId: "fb-1",
          interviewId: "int-1",
          round: 1,
          interviewerId: "u-1",
          interviewerName: "Ludovica Intervistatrice",
          score: 2,
          evidence: "Nota libera dell'intervistatore",
        },
        {
          feedbackId: "fb-2",
          interviewId: "int-1",
          round: 1,
          interviewerId: "u-2",
          interviewerName: "Bartolomeo Osservatore",
          score: 5,
          evidence: null,
        },
      ],
    },
    { criterionId: "crit-sql", cv: null, test: null, interviewers: [] },
  ],
  cv: { evaluationId: "ev-1", fitScore: 7, global: 3.8, perCriterion: true },
  test: null,
  interviews: [],
  legacy: { rubric: null, hiringNotes: null },
};

const score = computeDecisionScore({
  criteria: decision.criteria,
  sources: decision.sources,
  decisionWeights: null,
});

const reason = (overrides: Record<string, unknown> = {}) => ({
  title: "Titolo",
  explanation: "Spiegazione",
  criterionKeys: ["C1"],
  ...overrides,
});

describe("generateDecisionChallenge", () => {
  beforeEach(() => {
    vi.mocked(generateStructured).mockResolvedValue({ reasons: [reason()] });
  });

  it("calls generateStructured with the decision review task at temperature 0.7 and no seed", async () => {
    await generateDecisionChallenge({
      decision,
      score,
      outcome: "rejected",
      rationale: "Non convince",
      specificModel: "some/model",
    });

    expect(generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "decision_review",
        schema: aiDecisionChallengeSchema,
        temperature: 0.7,
        specificModel: "some/model",
      }),
    );
    const options = vi.mocked(generateStructured).mock.calls[0][0];
    expect(options).not.toHaveProperty("seed");
  });

  it("resolves the criterion keys to ids and drops unknown keys", async () => {
    vi.mocked(generateStructured).mockResolvedValue({
      reasons: [reason({ criterionKeys: [" c2 ", "C9", "C1", "C2"] })],
    });

    const result = await generateDecisionChallenge({
      decision,
      score,
      outcome: "offer",
    });

    expect(result.reasons[0].criterionIds).toEqual(["crit-sql", "crit-react"]);
  });

  it("keeps at most five reasons and drops reasons with an empty title", async () => {
    vi.mocked(generateStructured).mockResolvedValue({
      reasons: [
        reason({ title: "  " }),
        ...Array.from({ length: 7 }, (_, i) =>
          reason({ title: ` Motivo ${i + 1} `, explanation: " Testo " }),
        ),
      ],
    });

    const result = await generateDecisionChallenge({
      decision,
      score,
      outcome: "hired",
    });

    expect(MAX_CHALLENGE_REASONS).toBe(5);
    expect(result.reasons).toHaveLength(5);
    expect(result.reasons[0]).toEqual({
      title: "Motivo 1",
      explanation: "Testo",
      criterionIds: ["crit-react"],
    });
  });

  it("never puts the candidate's or the interviewers' identity or free text in the prompt", async () => {
    await generateDecisionChallenge({ decision, score, outcome: "rejected" });

    const { prompt, system } = vi.mocked(generateStructured).mock.calls[0][0];
    const text = `${system}\n${prompt}`;
    for (const forbidden of [
      "Mariolino",
      "Rossignoli",
      "Ludovica",
      "Bartolomeo",
      "Nota libera",
      "Progetti React",
    ]) {
      expect(text).not.toContain(forbidden);
    }
    expect(prompt).toContain("C1: React");
    expect(prompt).toContain("(2 intervistatori)");
    expect(prompt).toContain("voti discordanti");
    expect(prompt).toContain("C2: SQL");
    expect(prompt).toContain("senza prove");
  });
});
