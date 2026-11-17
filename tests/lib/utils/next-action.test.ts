import type { ApplicationStage } from "@/lib/schemas";
import { getNextAction, type ApplicationFacts } from "@/lib/utils/next-action";
import { describe, expect, it } from "vitest";

const facts = (overrides: Partial<ApplicationFacts> = {}): ApplicationFacts => ({
  stage: "applied",
  hasResume: true,
  hasResumeEvaluation: true,
  assessments: [],
  ...overrides,
});

const assessment = (
  overrides: Partial<ApplicationFacts["assessments"][number]> = {},
) => ({
  id: "a1",
  status: "pending" as const,
  hasEvaluation: false,
  createdAt: new Date("2026-01-01"),
  ...overrides,
});

const interview = (
  overrides: Partial<NonNullable<ApplicationFacts["interviews"]>[number]> = {},
) => ({
  id: "interview-1",
  status: "scheduled" as const,
  kitReady: true,
  feedbackMissing: false,
  ...overrides,
});

describe("getNextAction rows", () => {
  it("1) evaluate_cv when the CV is there and not evaluated", () => {
    expect(
      getNextAction(facts({ hasResumeEvaluation: false })),
    ).toMatchObject({ kind: "evaluate_cv", label: "Valuta CV", missingResume: false });
  });

  it("2) send_assessment in stage assessment with no test sent", () => {
    expect(getNextAction(facts({ stage: "assessment" }))).toMatchObject({
      kind: "send_assessment",
      label: "Invia test",
    });
  });

  it("3) generate_evaluation with the oldest completed test", () => {
    const result = getNextAction(
      facts({
        stage: "assessment",
        assessments: [
          assessment({ id: "new", status: "completed", createdAt: new Date("2026-03-01") }),
          assessment({ id: "old", status: "completed", createdAt: new Date("2026-01-01") }),
          assessment({ id: "done", status: "completed", hasEvaluation: true }),
        ],
      }),
    );
    expect(result).toMatchObject({
      kind: "generate_evaluation",
      label: "Genera valutazione",
      assessmentId: "old",
    });
  });

  it("4) schedule_interview in stage interview with nothing planned", () => {
    expect(getNextAction(facts({ stage: "interview" }))).toMatchObject({
      kind: "schedule_interview",
      label: "Pianifica colloquio",
    });
  });

  it("4) schedule_interview when only cancelled or no_show interviews exist", () => {
    expect(
      getNextAction(
        facts({
          stage: "interview",
          interviews: [
            interview({ status: "cancelled" }),
            interview({ status: "no_show" }),
          ],
        }),
      ).kind,
    ).toBe("schedule_interview");
  });

  it("5) prepare_interview when a planned interview has no kit", () => {
    expect(
      getNextAction(
        facts({ stage: "interview", interviews: [interview({ kitReady: false })] }),
      ),
    ).toMatchObject({
      kind: "prepare_interview",
      label: "Prepara colloquio",
      interviewId: "interview-1",
    });
  });

  it("6) fill_feedback when a held interview misses its feedback", () => {
    expect(
      getNextAction(
        facts({
          stage: "interview",
          interviews: [interview({ status: "completed", feedbackMissing: true })],
        }),
      ),
    ).toMatchObject({
      kind: "fill_feedback",
      label: "Compila scheda",
      interviewId: "interview-1",
    });
  });

  it("7) go_to_decision when every feedback is in", () => {
    expect(
      getNextAction(
        facts({
          stage: "decision",
          interviews: [interview({ status: "completed" })],
          allFeedbackSubmitted: true,
        }),
      ),
    ).toMatchObject({ kind: "go_to_decision", label: "Vai alla decisione" });
  });
});

describe("getNextAction precedence", () => {
  it("evaluate_cv wins over send_assessment", () => {
    expect(
      getNextAction(facts({ stage: "assessment", hasResumeEvaluation: false })).kind,
    ).toBe("evaluate_cv");
  });

  it("generate_evaluation wins over schedule_interview", () => {
    expect(
      getNextAction(
        facts({
          stage: "interview",
          assessments: [assessment({ status: "completed" })],
        }),
      ).kind,
    ).toBe("generate_evaluation");
  });

  it("ignores cancelled tests for send_assessment", () => {
    expect(
      getNextAction(
        facts({
          stage: "assessment",
          assessments: [assessment({ status: "cancelled" })],
        }),
      ).kind,
    ).toBe("send_assessment");
  });

  it("does not send a test again when one is pending", () => {
    expect(
      getNextAction(
        facts({ stage: "assessment", assessments: [assessment()] }),
      ).kind,
    ).toBe("advance_stage");
  });
});

describe("getNextAction resume", () => {
  it("skips evaluate_cv without a resume and flags it", () => {
    const result = getNextAction(
      facts({ hasResume: false, hasResumeEvaluation: false }),
    );
    expect(result.kind).not.toBe("evaluate_cv");
    expect(result.missingResume).toBe(true);
  });

  it.each(["hired", "rejected", "withdrawn"] as const)(
    "missingResume is false in %s",
    (stage) => {
      expect(
        getNextAction(facts({ stage, hasResume: false })).missingResume,
      ).toBe(false);
    },
  );
});

describe("getNextAction fallback", () => {
  const advances: [ApplicationStage, ApplicationStage, string][] = [
    ["applied", "screening", "Passa a Screening"],
    ["screening", "assessment", "Passa a Test"],
    ["assessment", "interview", "Passa a Colloquio"],
    ["interview", "decision", "Passa a Decisione"],
    ["decision", "offer", "Passa a Offerta"],
    ["offer", "hired", "Passa a Assunto"],
  ];

  it.each(advances)("from %s proposes %s", (stage, target, label) => {
    // In stage assessment a test is pending, in interview one is planned
    const result = getNextAction(
      facts({
        stage,
        assessments: stage === "assessment" ? [assessment()] : [],
        interviews: stage === "interview" ? [interview()] : undefined,
      }),
    );
    expect(result).toMatchObject({
      kind: "advance_stage",
      targetStage: target,
      label,
    });
  });

  it("hired is closed and cannot be reopened", () => {
    expect(getNextAction(facts({ stage: "hired" }))).toMatchObject({
      kind: "closed",
      label: "Candidatura chiusa",
      canReopen: false,
    });
  });

  it.each(["rejected", "withdrawn"] as const)(
    "%s is closed and can be reopened",
    (stage) => {
      expect(getNextAction(facts({ stage }))).toMatchObject({
        kind: "closed",
        label: "Candidatura chiusa",
        canReopen: true,
      });
    },
  );
});

describe("getNextAction without interviews", () => {
  it("rows 5–7 never win when interviews and feedback are omitted", () => {
    const kinds = (
      ["applied", "screening", "assessment", "interview", "decision", "offer"] as const
    ).map((stage) => getNextAction(facts({ stage })).kind);

    expect(kinds).not.toContain("prepare_interview");
    expect(kinds).not.toContain("fill_feedback");
    expect(kinds).not.toContain("go_to_decision");
    expect(getNextAction(facts({ stage: "interview" })).kind).toBe(
      "schedule_interview",
    );
  });
});

describe("getNextAction interview ids", () => {
  it("prepare_interview points to the first scheduled interview without a ready kit", () => {
    const action = getNextAction(
      facts({
        stage: "interview",
        interviews: [
          interview({ id: "ready", kitReady: true }),
          interview({ id: "draft-1", kitReady: false }),
          interview({ id: "draft-2", kitReady: false }),
        ],
      }),
    );
    expect(action).toMatchObject({ kind: "prepare_interview", interviewId: "draft-1" });
  });

  it("fill_feedback points to the first completed interview with missing feedback", () => {
    const action = getNextAction(
      facts({
        stage: "interview",
        interviews: [
          interview({ id: "done", status: "completed", feedbackMissing: false }),
          interview({ id: "missing", status: "completed", feedbackMissing: true }),
        ],
      }),
    );
    expect(action).toMatchObject({ kind: "fill_feedback", interviewId: "missing" });
  });

  it("prepare_interview still wins over fill_feedback (row order unchanged)", () => {
    const action = getNextAction(
      facts({
        stage: "interview",
        interviews: [
          interview({ id: "missing", status: "completed", feedbackMissing: true }),
          interview({ id: "draft", kitReady: false }),
        ],
      }),
    );
    expect(action).toMatchObject({ kind: "prepare_interview", interviewId: "draft" });
  });

  it("other rows carry no interview id", () => {
    expect(getNextAction(facts({ stage: "interview" })).interviewId).toBeUndefined();
  });
});
