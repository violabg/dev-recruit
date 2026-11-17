import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/assessment-evaluation", () => ({
  evaluateAssessmentAnswer: vi.fn(),
  completeAssessmentEvaluation: vi.fn(),
  recalculateAnswerEvaluations: vi.fn(),
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateEvaluationCache: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
}));

import {
  completeAssessmentEvaluationAction,
  evaluateAssessmentAnswerAction,
  recalculateAnswerEvaluationsAction,
} from "@/lib/actions/evaluations";
import { requireUser } from "@/lib/auth-server";
import {
  completeAssessmentEvaluation,
  evaluateAssessmentAnswer,
  recalculateAnswerEvaluations,
} from "@/lib/services/assessment-evaluation";
import { UserError } from "@/lib/services/user-error";
import { invalidateEvaluationCache } from "@/lib/utils/cache-utils";

const EXPIRED = "Sessione scaduta. Accedi di nuovo per continuare.";

const perQuestion = {
  evaluation: "Buona risposta",
  score: 8,
  strengths: ["Chiara"],
  weaknesses: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
});

describe("evaluateAssessmentAnswerAction", () => {
  it("returns the expired-session result without a session", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    expect(await evaluateAssessmentAnswerAction("a-1", "q-1")).toEqual({
      success: false,
      error: EXPIRED,
    });
    expect(evaluateAssessmentAnswer).not.toHaveBeenCalled();
  });

  it("returns the evaluation of the answer and invalidates nothing", async () => {
    vi.mocked(evaluateAssessmentAnswer).mockResolvedValueOnce({
      ...perQuestion,
      maxScore: 10,
    });

    const result = await evaluateAssessmentAnswerAction("a-1", "q-1");

    expect(evaluateAssessmentAnswer).toHaveBeenCalledWith("a-1", "q-1");
    expect(result).toEqual({
      success: true,
      evaluation: { ...perQuestion, maxScore: 10 },
    });
    expect(invalidateEvaluationCache).not.toHaveBeenCalled();
  });

  it("refuses an empty id", async () => {
    const result = await evaluateAssessmentAnswerAction("", "q-1");

    expect(result).toEqual({ success: false, error: "L'ID è obbligatorio" });
    expect(evaluateAssessmentAnswer).not.toHaveBeenCalled();
  });
});

describe("completeAssessmentEvaluationAction", () => {
  const input = {
    assessmentId: "a-1",
    questionEvaluations: { "q-1": perQuestion },
  };

  it("returns the expired-session result without a session", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    expect(await completeAssessmentEvaluationAction(input)).toEqual({
      success: false,
      error: EXPIRED,
    });
  });

  it("returns the parse error for an invalid input", async () => {
    const result = await completeAssessmentEvaluationAction({
      assessmentId: "a-1",
      questionEvaluations: { "q-1": { ...perQuestion, score: 11 } },
    });

    expect(result).toEqual({
      success: false,
      error: "Il punteggio massimo è 10",
    });
    expect(completeAssessmentEvaluation).not.toHaveBeenCalled();
  });

  it("calls the service and invalidates the evaluation cache", async () => {
    const overall = {
      evaluation: "Bene",
      strengths: [],
      weaknesses: [],
      recommendation: "Procedere",
      fitScore: 70,
    };
    vi.mocked(completeAssessmentEvaluation).mockResolvedValueOnce({
      evaluationId: "e-1",
      overall,
      quizScore: 80,
    });

    const result = await completeAssessmentEvaluationAction(input);

    expect(completeAssessmentEvaluation).toHaveBeenCalledWith({
      assessmentId: "a-1",
      questionEvaluations: { "q-1": perQuestion },
      userId: "user-123",
    });
    expect(invalidateEvaluationCache).toHaveBeenCalledWith({
      evaluationId: "e-1",
      assessmentId: "a-1",
    });
    expect(result).toEqual({
      success: true,
      evaluationId: "e-1",
      overall,
      quizScore: 80,
    });
  });
});

describe("recalculateAnswerEvaluationsAction", () => {
  const input = {
    assessmentId: "a-1",
    questionEvaluations: { "q-1": perQuestion },
  };
  const stored = {
    "q-1": { score: 8, strengths: ["Chiara"], weaknesses: [] },
  };

  it("returns the expired-session result without a session", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    expect(await recalculateAnswerEvaluationsAction(input)).toEqual({
      success: false,
      error: EXPIRED,
    });
    expect(recalculateAnswerEvaluations).not.toHaveBeenCalled();
  });

  it("returns the parse error for an invalid input", async () => {
    const result = await recalculateAnswerEvaluationsAction({
      assessmentId: "",
      questionEvaluations: {},
    });

    expect(result).toEqual({ success: false, error: "L'ID è obbligatorio" });
    expect(recalculateAnswerEvaluations).not.toHaveBeenCalled();
  });

  it("calls the service, invalidates and returns the stored detail", async () => {
    vi.mocked(recalculateAnswerEvaluations).mockResolvedValueOnce({
      evaluationId: "e-1",
      answerEvaluations: stored,
    });

    const result = await recalculateAnswerEvaluationsAction(input);

    expect(recalculateAnswerEvaluations).toHaveBeenCalledWith({
      assessmentId: "a-1",
      questionEvaluations: { "q-1": perQuestion },
    });
    expect(invalidateEvaluationCache).toHaveBeenCalledWith({
      evaluationId: "e-1",
      assessmentId: "a-1",
    });
    expect(result).toEqual({
      success: true,
      evaluationId: "e-1",
      answerEvaluations: stored,
    });
  });

  it("returns a UserError of the service as the error and invalidates nothing", async () => {
    vi.mocked(recalculateAnswerEvaluations).mockRejectedValueOnce(
      new UserError("Valutazione non trovata"),
    );

    const result = await recalculateAnswerEvaluationsAction(input);

    expect(result).toEqual({ success: false, error: "Valutazione non trovata" });
    expect(invalidateEvaluationCache).not.toHaveBeenCalled();
  });
});
