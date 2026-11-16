import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/ai/generate", () => ({
  generateStructured: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { generateStructured } from "@/lib/services/ai/generate";
import {
  answerToText,
  completeAssessmentEvaluation,
  computeQuizScore,
  evaluateAssessmentAnswer,
} from "@/lib/services/assessment-evaluation";

const dbQuestion = (id: string, type: string, extra = {}) => ({
  id,
  type,
  question: `Domanda ${id}`,
  keywords: [],
  explanation: null,
  options: [],
  correctAnswer: null,
  sampleAnswer: null,
  codeSnippet: null,
  sampleSolution: null,
  language: null,
  isFavorite: false,
  ...extra,
});

const assessment = (overrides: Record<string, unknown> = {}) => ({
  id: "int1",
  answers: {
    mc: "1",
    open: "Una risposta",
    code: { code: "const a = 1;" },
    beh: "Parlerei con il team",
  },
  candidate: { firstName: "Mario", lastName: "Rossi" },
  evaluation: null,
  quiz: {
    title: "Quiz Frontend",
    quizQuestions: [
      {
        order: 0,
        question: dbQuestion("mc", "multiple_choice", {
          options: ["A", "B", "C", "D"],
          correctAnswer: 1,
        }),
      },
      { order: 1, question: dbQuestion("open", "open_question") },
      { order: 2, question: dbQuestion("code", "code_snippet") },
      { order: 3, question: dbQuestion("beh", "behavioral_scenario") },
      { order: 4, question: dbQuestion("skipped", "open_question") },
    ],
  },
  ...overrides,
});

const result = (score: number) => ({
  evaluation: "ok",
  score,
  strengths: ["s"],
  weaknesses: ["w"],
});

describe("answerToText", () => {
  it("returns null for missing or empty answers", () => {
    expect(answerToText({ type: "open_question" }, undefined)).toBeNull();
    expect(answerToText({ type: "open_question" }, null)).toBeNull();
    expect(answerToText({ type: "open_question" }, "")).toBeNull();
    expect(answerToText({ type: "code_snippet" }, { code: "" })).toBeNull();
  });

  it("keeps the option index for multiple choice, including 0", () => {
    expect(answerToText({ type: "multiple_choice" }, "0")).toBe("0");
    expect(answerToText({ type: "multiple_choice" }, 0)).toBe("0");
  });

  it("unwraps code answers and accepts plain strings", () => {
    expect(answerToText({ type: "code_snippet" }, { code: "x()" })).toBe("x()");
    expect(answerToText({ type: "code_snippet" }, "x()")).toBe("x()");
  });

  it("returns text for open and behavioral answers", () => {
    expect(answerToText({ type: "open_question" }, "ciao")).toBe("ciao");
    expect(answerToText({ type: "behavioral_scenario" }, "ciao")).toBe("ciao");
  });
});

describe("computeQuizScore", () => {
  it("is the percentage of available points", () => {
    expect(computeQuizScore([{ score: 10 }, { score: 5 }])).toBe(75);
    expect(computeQuizScore([{ score: 0 }, { score: 7 }, { score: 7 }])).toBe(
      47,
    );
  });

  it("is 0 with no evaluations", () => {
    expect(computeQuizScore([])).toBe(0);
  });
});

describe("evaluateAssessmentAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(
      assessment() as any,
    );
    vi.mocked(generateStructured).mockResolvedValue(result(8));
  });

  it.each(["mc", "open", "code", "beh"])(
    "evaluates an answered %s question",
    async (questionId) => {
      const evaluation = await evaluateAssessmentAnswer("int1", questionId);

      expect(evaluation).toEqual({ ...result(8), maxScore: 10 });
      expect(generateStructured).toHaveBeenCalledWith(
        expect.objectContaining({ task: "evaluation", temperature: 0, seed: 42 }),
      );
    },
  );

  it("puts the stored answer in the prompt, not a client value", async () => {
    await evaluateAssessmentAnswer("int1", "beh");

    const { prompt } = vi.mocked(generateStructured).mock.calls[0][0];
    expect(prompt).toContain("Parlerei con il team");
    expect(prompt).toContain("behavioral scenario");
  });

  it("rejects a question that is not part of the assessment", async () => {
    await expect(evaluateAssessmentAnswer("int1", "other")).rejects.toThrow(
      "Domanda non trovata",
    );
  });

  it("rejects an unanswered question", async () => {
    await expect(evaluateAssessmentAnswer("int1", "skipped")).rejects.toThrow(
      "non ha risposto",
    );
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("throws when the assessment does not exist", async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValueOnce(null);

    await expect(evaluateAssessmentAnswer("nope", "mc")).rejects.toThrow(
      "Test non trovato",
    );
  });
});

describe("completeAssessmentEvaluation", () => {
  const overall = {
    evaluation: "Buon candidato",
    strengths: ["a"],
    weaknesses: ["b"],
    recommendation: "Procedere",
    fitScore: 84,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(
      assessment() as any,
    );
    vi.mocked(prisma.evaluation.create).mockResolvedValue({
      id: "eval1",
    } as any);
    vi.mocked(generateStructured).mockResolvedValue(overall);
  });

  it("computes the score on the server and stores the evaluation", async () => {
    const outcome = await completeAssessmentEvaluation({
      assessmentId: "int1",
      questionEvaluations: { mc: result(10), open: result(5) },
      userId: "user1",
    });

    expect(outcome).toEqual({
      evaluationId: "eval1",
      overall,
      quizScore: 75,
    });
    expect(prisma.evaluation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Quiz Frontend",
        assessmentId: "int1",
        fitScore: 8,
        quizScore: 75,
        createdBy: "user1",
      }),
      select: { id: true },
    });
  });

  it("tells the model how many questions were answered", async () => {
    await completeAssessmentEvaluation({
      assessmentId: "int1",
      questionEvaluations: { mc: result(10) },
      userId: "user1",
    });

    const { prompt } = vi.mocked(generateStructured).mock.calls[0][0];
    expect(prompt).toContain("Mario Rossi");
    expect(prompt).toContain("answered 4 questions out of 5");
  });

  it("refuses a second evaluation for the same assessment", async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValueOnce(
      assessment({ evaluation: { id: "existing" } }) as any,
    );

    await expect(
      completeAssessmentEvaluation({
        assessmentId: "int1",
        questionEvaluations: { mc: result(10) },
        userId: "user1",
      }),
    ).rejects.toThrow("Esiste già una valutazione");
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("rejects results for questions that were not answered", async () => {
    await expect(
      completeAssessmentEvaluation({
        assessmentId: "int1",
        questionEvaluations: { skipped: result(10) },
        userId: "user1",
      }),
    ).rejects.toThrow("domande non valide");
  });

  it("rejects an empty result set", async () => {
    await expect(
      completeAssessmentEvaluation({
        assessmentId: "int1",
        questionEvaluations: {},
        userId: "user1",
      }),
    ).rejects.toThrow("Nessuna risposta valutata");
  });

  it("stores nothing when the overall evaluation fails", async () => {
    vi.mocked(generateStructured).mockRejectedValueOnce(new Error("down"));

    await expect(
      completeAssessmentEvaluation({
        assessmentId: "int1",
        questionEvaluations: { mc: result(10) },
        userId: "user1",
      }),
    ).rejects.toThrow();
    expect(prisma.evaluation.create).not.toHaveBeenCalled();
  });
});
