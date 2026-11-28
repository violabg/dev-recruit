import { describe, expect, it } from "vitest";
import { quizFormWidget } from "@/lib/mcp/widgets/quiz-form";
import { chosenQuestionTypes, quizRequest } from "@/lib/mcp/widgets/quiz-request";

const position = { id: "pos-1", title: "Frontend", experienceLevel: "Senior", skills: ["React", "CSS"] };

describe("quizFormWidget", () => {
  it("starts from the dashboard defaults of the position", () => {
    const widget = quizFormWidget(position, { positionId: "pos-1" });

    expect(widget.prefill).toEqual({
      quizTitle: "Test per Frontend (Senior)",
      instructions: "",
      questionCount: 10,
      difficulty: 3,
      includeMultipleChoice: true,
      includeOpenQuestions: true,
      includeCodeSnippets: true,
      includeBehavioralScenarios: false,
      enableTimeLimit: true,
      timeLimit: 30,
    });
    expect(widget.previewTool).toBe("save_quiz_draft");
  });

  it("applies what the assistant knows; null time limit turns the limit off", () => {
    const widget = quizFormWidget(position, {
      positionId: "pos-1",
      quizTitle: "  Quiz CSS ",
      instructions: " solo layout ",
      difficulty: 5,
      includeCodeSnippets: false,
      timeLimit: null,
    });

    expect(widget.prefill).toMatchObject({
      quizTitle: "Quiz CSS",
      instructions: "solo layout",
      difficulty: 5,
      includeCodeSnippets: false,
      enableTimeLimit: false,
      timeLimit: 30,
    });
  });
});

describe("quizRequest", () => {
  const values = quizFormWidget(position, { positionId: "pos-1" }).prefill;

  it("lists the chosen parameters and the preview tool", () => {
    const text = quizRequest(position, { ...values, instructions: "hook" }, "save_quiz_draft");

    expect(text).toContain("positionId pos-1");
    expect(text).toContain("10 domande, difficoltà 3/5 (media)");
    expect(text).toContain("code_snippet");
    expect(text).not.toContain("behavioral_scenario");
    expect(text).toContain("limite di tempo: 30 minuti");
    expect(text).toContain("istruzioni: hook");
    expect(text).toContain("(React, CSS)");
    expect(text).toContain("save_quiz_draft (timeLimit 30)");
  });

  it("asks for no time limit and leaves out empty instructions", () => {
    const text = quizRequest(position, { ...values, enableTimeLimit: false }, "save_quiz_draft");

    expect(text).toContain("nessun limite di tempo");
    expect(text).toContain("(timeLimit null)");
    expect(text).not.toContain("istruzioni:");
  });

  it("knows when no question type is chosen", () => {
    expect(
      chosenQuestionTypes({
        ...values,
        includeMultipleChoice: false,
        includeOpenQuestions: false,
        includeCodeSnippets: false,
      }),
    ).toEqual([]);
  });
});
