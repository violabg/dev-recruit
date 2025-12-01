/**
 * Tests for Question Prompt Helpers
 */

import {
  createBackendQuestionParams,
  createBaseParams,
  createCodeSnippetParams,
  createFrontendQuestionParams,
  createMultipleChoiceParams,
  createOpenQuestionParams,
  createQuestionParams,
} from "@/lib/utils/question-prompt-helpers";
import { describe, expect, it } from "vitest";

describe("createBaseParams", () => {
  const baseConfig = {
    quizTitle: "JavaScript Quiz",
    positionTitle: "Frontend Developer",
    experienceLevel: "senior",
    skills: ["React", "TypeScript", "CSS"],
  };

  it("should create base params with required fields", () => {
    const params = createBaseParams(baseConfig);

    expect(params.quizTitle).toBe("JavaScript Quiz");
    expect(params.positionTitle).toBe("Frontend Developer");
    expect(params.experienceLevel).toBe("senior");
    expect(params.skills).toEqual(["React", "TypeScript", "CSS"]);
  });

  it("should set default difficulty to 3", () => {
    const params = createBaseParams(baseConfig);

    expect(params.difficulty).toBe(3);
  });

  it("should use provided difficulty", () => {
    const params = createBaseParams({ ...baseConfig, difficulty: 5 });

    expect(params.difficulty).toBe(5);
  });

  it("should default to empty previous questions", () => {
    const params = createBaseParams(baseConfig);

    expect(params.previousQuestions).toEqual([]);
  });

  it("should use provided previous questions", () => {
    const previousQuestions = [{ question: "What is React?" }];
    const params = createBaseParams({ ...baseConfig, previousQuestions });

    expect(params.previousQuestions).toEqual(previousQuestions);
  });

  it("should preserve optional fields", () => {
    const config = {
      ...baseConfig,
      specificModel: "gpt-4",
      instructions: "Focus on advanced topics",
    };
    const params = createBaseParams(config);

    expect(params.specificModel).toBe("gpt-4");
    expect(params.instructions).toBe("Focus on advanced topics");
  });
});

describe("createMultipleChoiceParams", () => {
  const baseConfig = {
    quizTitle: "Test Quiz",
    positionTitle: "Developer",
    experienceLevel: "junior",
    skills: ["JavaScript"],
  };

  it("should create multiple choice params with type", () => {
    const params = createMultipleChoiceParams(baseConfig, 1);

    expect(params.type).toBe("multiple_choice");
    expect(params.questionIndex).toBe(1);
  });

  it("should include base params", () => {
    const params = createMultipleChoiceParams(baseConfig, 1);

    expect(params.quizTitle).toBe("Test Quiz");
    expect(params.positionTitle).toBe("Developer");
  });

  it("should accept focusAreas option", () => {
    const params = createMultipleChoiceParams(baseConfig, 1, {
      focusAreas: ["React Hooks", "State"],
    });

    expect(params.focusAreas).toEqual(["React Hooks", "State"]);
  });

  it("should accept distractorComplexity option", () => {
    const params = createMultipleChoiceParams(baseConfig, 1, {
      distractorComplexity: "complex",
    });

    expect(params.distractorComplexity).toBe("complex");
  });

  it("should handle empty options", () => {
    const params = createMultipleChoiceParams(baseConfig, 1, {});

    expect(params.focusAreas).toBeUndefined();
    expect(params.distractorComplexity).toBeUndefined();
  });
});

describe("createOpenQuestionParams", () => {
  const baseConfig = {
    quizTitle: "Test Quiz",
    positionTitle: "Developer",
    experienceLevel: "mid",
    skills: ["Python"],
  };

  it("should create open question params with type", () => {
    const params = createOpenQuestionParams(baseConfig, 2);

    expect(params.type).toBe("open_question");
    expect(params.questionIndex).toBe(2);
  });

  it("should accept expectedResponseLength option", () => {
    const params = createOpenQuestionParams(baseConfig, 2, {
      expectedResponseLength: "long",
    });

    expect(params.expectedResponseLength).toBe("long");
  });

  it("should accept evaluationCriteria option", () => {
    const criteria = ["accuracy", "clarity", "depth"];
    const params = createOpenQuestionParams(baseConfig, 2, {
      evaluationCriteria: criteria,
    });

    expect(params.evaluationCriteria).toEqual(criteria);
  });
});

describe("createCodeSnippetParams", () => {
  const baseConfig = {
    quizTitle: "Code Review Quiz",
    positionTitle: "Backend Developer",
    experienceLevel: "senior",
    skills: ["Node.js", "Express"],
  };

  it("should create code snippet params with type", () => {
    const params = createCodeSnippetParams(baseConfig, 3);

    expect(params.type).toBe("code_snippet");
    expect(params.questionIndex).toBe(3);
  });

  it("should accept language option", () => {
    const params = createCodeSnippetParams(baseConfig, 3, {
      language: "typescript",
    });

    expect(params.language).toBe("typescript");
  });

  it("should accept bugType option", () => {
    const params = createCodeSnippetParams(baseConfig, 3, {
      bugType: "security",
    });

    expect(params.bugType).toBe("security");
  });

  it("should accept codeComplexity option", () => {
    const params = createCodeSnippetParams(baseConfig, 3, {
      codeComplexity: "advanced",
    });

    expect(params.codeComplexity).toBe("advanced");
  });

  it("should accept includeComments option", () => {
    const params = createCodeSnippetParams(baseConfig, 3, {
      includeComments: false,
    });

    expect(params.includeComments).toBe(false);
  });

  it("should handle all options together", () => {
    const params = createCodeSnippetParams(baseConfig, 3, {
      language: "python",
      bugType: "logic",
      codeComplexity: "intermediate",
      includeComments: true,
    });

    expect(params.language).toBe("python");
    expect(params.bugType).toBe("logic");
    expect(params.codeComplexity).toBe("intermediate");
    expect(params.includeComments).toBe(true);
  });
});

describe("createQuestionParams", () => {
  const baseConfig = {
    quizTitle: "Generic Quiz",
    positionTitle: "Developer",
    experienceLevel: "junior",
    skills: ["JavaScript"],
  };

  it("should create multiple choice params for multiple_choice type", () => {
    const params = createQuestionParams("multiple_choice", baseConfig, 1);

    expect(params.type).toBe("multiple_choice");
  });

  it("should create open question params for open_question type", () => {
    const params = createQuestionParams("open_question", baseConfig, 1);

    expect(params.type).toBe("open_question");
  });

  it("should create code snippet params for code_snippet type", () => {
    const params = createQuestionParams("code_snippet", baseConfig, 1);

    expect(params.type).toBe("code_snippet");
  });

  it("should pass type-specific options", () => {
    const params = createQuestionParams("multiple_choice", baseConfig, 1, {
      focusAreas: ["React"],
    });

    expect((params as { focusAreas?: string[] }).focusAreas).toEqual(["React"]);
  });

  it("should throw for unsupported question type", () => {
    expect(() =>
      createQuestionParams("invalid_type" as "multiple_choice", baseConfig, 1)
    ).toThrow("Unsupported question type: invalid_type");
  });
});

describe("createFrontendQuestionParams", () => {
  const baseConfig = {
    quizTitle: "Frontend Quiz",
    positionTitle: "Frontend Developer",
    experienceLevel: "mid",
    skills: ["React", "Vue"],
  };

  it("should create multiple choice params with frontend defaults", () => {
    const params = createFrontendQuestionParams(
      "multiple_choice",
      baseConfig,
      1
    );

    expect(params.type).toBe("multiple_choice");
    expect((params as { focusAreas?: string[] }).focusAreas).toEqual([
      "React",
      "JavaScript",
      "CSS",
      "DOM",
    ]);
    expect(
      (params as { distractorComplexity?: string }).distractorComplexity
    ).toBe("moderate");
  });

  it("should create open question params with frontend defaults", () => {
    const params = createFrontendQuestionParams("open_question", baseConfig, 1);

    expect(params.type).toBe("open_question");
    expect(
      (params as { expectedResponseLength?: string }).expectedResponseLength
    ).toBe("medium");
    expect(
      (params as { evaluationCriteria?: string[] }).evaluationCriteria
    ).toEqual([
      "technical accuracy",
      "best practices",
      "conceptual understanding",
    ]);
  });

  it("should create code snippet params with frontend defaults", () => {
    const params = createFrontendQuestionParams("code_snippet", baseConfig, 1);

    expect(params.type).toBe("code_snippet");
    expect((params as { language?: string }).language).toBe("javascript");
    expect((params as { bugType?: string }).bugType).toBe("logic");
    expect((params as { codeComplexity?: string }).codeComplexity).toBe(
      "intermediate"
    );
    expect((params as { includeComments?: boolean }).includeComments).toBe(
      true
    );
  });
});

describe("createBackendQuestionParams", () => {
  const baseConfig = {
    quizTitle: "Backend Quiz",
    positionTitle: "Backend Developer",
    experienceLevel: "senior",
    skills: ["Node.js", "PostgreSQL"],
  };

  it("should create multiple choice params with backend defaults", () => {
    const params = createBackendQuestionParams(
      "multiple_choice",
      baseConfig,
      1
    );

    expect(params.type).toBe("multiple_choice");
    expect((params as { focusAreas?: string[] }).focusAreas).toEqual([
      "APIs",
      "databases",
      "server architecture",
      "security",
    ]);
    expect(
      (params as { distractorComplexity?: string }).distractorComplexity
    ).toBe("complex");
  });

  it("should create open question params with backend defaults", () => {
    const params = createBackendQuestionParams("open_question", baseConfig, 1);

    expect(params.type).toBe("open_question");
    expect(
      (params as { expectedResponseLength?: string }).expectedResponseLength
    ).toBe("long");
    expect(
      (params as { evaluationCriteria?: string[] }).evaluationCriteria
    ).toEqual(["system design", "scalability", "security considerations"]);
  });

  it("should create code snippet params with backend defaults", () => {
    const params = createBackendQuestionParams("code_snippet", baseConfig, 1);

    expect(params.type).toBe("code_snippet");
    expect((params as { language?: string }).language).toBe("javascript");
    expect((params as { bugType?: string }).bugType).toBe("security");
    expect((params as { codeComplexity?: string }).codeComplexity).toBe(
      "advanced"
    );
    expect((params as { includeComments?: boolean }).includeComments).toBe(
      true
    );
  });
});
