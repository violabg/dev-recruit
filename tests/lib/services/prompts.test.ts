/**
 * Tests for AI Service Prompts
 */

import {
  buildPositionDescriptionPrompt,
  buildQuestionPrompts,
  buildQuizPrompt,
  buildQuizSystemPrompt,
  questionPromptBuilders,
} from "@/lib/services/ai/prompts";
import type {
  CodeSnippetQuestionParams,
  GeneratePositionDescriptionParams,
  GenerateQuizParams,
  MultipleChoiceQuestionParams,
  OpenQuestionParams,
} from "@/lib/services/ai/types";
import { describe, expect, it } from "vitest";

describe("questionPromptBuilders", () => {
  describe("multiple_choice", () => {
    it("should generate system prompt with question index", () => {
      const systemPrompt = questionPromptBuilders.multiple_choice.system(1);

      expect(systemPrompt).toContain("q1");
      expect(systemPrompt).toContain("multiple choice");
      expect(systemPrompt).toContain("correctAnswer");
      expect(systemPrompt).toContain("options");
    });

    it("should generate user prompt with context", () => {
      const params: MultipleChoiceQuestionParams = {
        type: "multiple_choice",
        questionIndex: 1,
        quizTitle: "JavaScript Quiz",
        positionTitle: "Frontend Developer",
        experienceLevel: "senior",
        skills: ["JavaScript", "React"],
        difficulty: 3,
      };

      const userPrompt = questionPromptBuilders.multiple_choice.user(params);

      expect(userPrompt).toContain("Frontend Developer");
      expect(userPrompt).toContain("senior");
      expect(userPrompt).toContain("JavaScript, React");
    });

    it("should include focus areas when provided", () => {
      const params: MultipleChoiceQuestionParams = {
        type: "multiple_choice",
        questionIndex: 1,
        quizTitle: "Test Quiz",
        positionTitle: "Developer",
        experienceLevel: "mid",
        skills: ["TypeScript"],
        focusAreas: ["async/await", "promises"],
      };

      const userPrompt = questionPromptBuilders.multiple_choice.user(params);

      expect(userPrompt).toContain("Focus areas");
      expect(userPrompt).toContain("async/await, promises");
    });

    it("should include distractor complexity when provided", () => {
      const params: MultipleChoiceQuestionParams = {
        type: "multiple_choice",
        questionIndex: 1,
        quizTitle: "Test Quiz",
        positionTitle: "Developer",
        experienceLevel: "mid",
        skills: ["TypeScript"],
        distractorComplexity: "complex",
      };

      const userPrompt = questionPromptBuilders.multiple_choice.user(params);

      expect(userPrompt).toContain("Distractor complexity: complex");
    });
  });

  describe("open_question", () => {
    it("should generate system prompt with question index", () => {
      const systemPrompt = questionPromptBuilders.open_question.system(2);

      expect(systemPrompt).toContain("q2");
      expect(systemPrompt).toContain("open question");
      expect(systemPrompt).toContain("sampleAnswer");
      expect(systemPrompt).toContain(
        "DO NOT ask questions that require writing blocks of code"
      );
    });

    it("should generate user prompt with context", () => {
      const params: OpenQuestionParams = {
        type: "open_question",
        questionIndex: 2,
        quizTitle: "Architecture Quiz",
        positionTitle: "Backend Developer",
        experienceLevel: "senior",
        skills: ["Node.js", "PostgreSQL"],
      };

      const userPrompt = questionPromptBuilders.open_question.user(params);

      expect(userPrompt).toContain("Backend Developer");
      expect(userPrompt).toContain("Node.js, PostgreSQL");
      expect(userPrompt).toContain(
        "DO NOT create questions that ask to write blocks of code"
      );
    });

    it("should include expected response length when provided", () => {
      const params: OpenQuestionParams = {
        type: "open_question",
        questionIndex: 1,
        quizTitle: "Test Quiz",
        positionTitle: "Developer",
        experienceLevel: "mid",
        skills: ["Python"],
        expectedResponseLength: "long",
      };

      const userPrompt = questionPromptBuilders.open_question.user(params);

      expect(userPrompt).toContain("Expected response length: long");
    });

    it("should include evaluation criteria when provided", () => {
      const params: OpenQuestionParams = {
        type: "open_question",
        questionIndex: 1,
        quizTitle: "Test Quiz",
        positionTitle: "Developer",
        experienceLevel: "mid",
        skills: ["Python"],
        evaluationCriteria: ["accuracy", "completeness"],
      };

      const userPrompt = questionPromptBuilders.open_question.user(params);

      expect(userPrompt).toContain("Evaluation criteria");
      expect(userPrompt).toContain("accuracy, completeness");
    });
  });

  describe("code_snippet", () => {
    it("should generate system prompt with question index", () => {
      const systemPrompt = questionPromptBuilders.code_snippet.system(3);

      expect(systemPrompt).toContain("q3");
      expect(systemPrompt).toContain("code snippet");
      expect(systemPrompt).toContain("codeSnippet");
      expect(systemPrompt).toContain("sampleSolution");
      expect(systemPrompt).toContain("language");
    });

    it("should generate user prompt with context", () => {
      const params: CodeSnippetQuestionParams = {
        type: "code_snippet",
        questionIndex: 3,
        quizTitle: "Code Review Quiz",
        positionTitle: "Full Stack Developer",
        experienceLevel: "senior",
        skills: ["JavaScript", "TypeScript"],
        language: "typescript",
      };

      const userPrompt = questionPromptBuilders.code_snippet.user(params);

      expect(userPrompt).toContain("Full Stack Developer");
      expect(userPrompt).toContain("typescript");
      expect(userPrompt).toContain("Programming language: typescript");
    });

    it("should infer language from skills when not provided", () => {
      const params: CodeSnippetQuestionParams = {
        type: "code_snippet",
        questionIndex: 1,
        quizTitle: "Test Quiz",
        positionTitle: "Developer",
        experienceLevel: "mid",
        skills: ["Python", "Django"],
      };

      const userPrompt = questionPromptBuilders.code_snippet.user(params);

      expect(userPrompt).toContain("Programming language: python");
    });

    it("should default to javascript when no language info available", () => {
      const params: CodeSnippetQuestionParams = {
        type: "code_snippet",
        questionIndex: 1,
        quizTitle: "Test Quiz",
        positionTitle: "Developer",
        experienceLevel: "mid",
        skills: ["SQL", "REST API"],
      };

      const userPrompt = questionPromptBuilders.code_snippet.user(params);

      expect(userPrompt).toContain("Programming language: javascript");
    });

    it("should include bug type when provided", () => {
      const params: CodeSnippetQuestionParams = {
        type: "code_snippet",
        questionIndex: 1,
        quizTitle: "Test Quiz",
        positionTitle: "Developer",
        experienceLevel: "mid",
        skills: ["JavaScript"],
        bugType: "logic",
      };

      const userPrompt = questionPromptBuilders.code_snippet.user(params);

      expect(userPrompt).toContain("bug fixing");
      expect(userPrompt).toContain("Bug type focus: logic");
    });

    it("should handle code improvement when no bug type", () => {
      const params: CodeSnippetQuestionParams = {
        type: "code_snippet",
        questionIndex: 1,
        quizTitle: "Test Quiz",
        positionTitle: "Developer",
        experienceLevel: "mid",
        skills: ["JavaScript"],
      };

      const userPrompt = questionPromptBuilders.code_snippet.user(params);

      expect(userPrompt).toContain("code improvement/analysis");
    });

    it("should include code complexity when provided", () => {
      const params: CodeSnippetQuestionParams = {
        type: "code_snippet",
        questionIndex: 1,
        quizTitle: "Test Quiz",
        positionTitle: "Developer",
        experienceLevel: "mid",
        skills: ["JavaScript"],
        codeComplexity: "advanced",
      };

      const userPrompt = questionPromptBuilders.code_snippet.user(params);

      expect(userPrompt).toContain("Code complexity: advanced");
    });
  });
});

describe("buildQuestionPrompts", () => {
  it("should build prompts for multiple choice questions", () => {
    const params: MultipleChoiceQuestionParams = {
      type: "multiple_choice",
      questionIndex: 1,
      quizTitle: "Test Quiz",
      positionTitle: "Developer",
      experienceLevel: "mid",
      skills: ["JavaScript"],
    };

    const { systemPrompt, userPrompt } = buildQuestionPrompts(params);

    expect(systemPrompt).toContain("multiple choice");
    expect(userPrompt).toContain("Developer");
  });

  it("should build prompts for open questions", () => {
    const params: OpenQuestionParams = {
      type: "open_question",
      questionIndex: 2,
      quizTitle: "Test Quiz",
      positionTitle: "Developer",
      experienceLevel: "senior",
      skills: ["React"],
    };

    const { systemPrompt, userPrompt } = buildQuestionPrompts(params);

    expect(systemPrompt).toContain("open question");
    expect(userPrompt).toContain("Developer");
  });

  it("should build prompts for code snippet questions", () => {
    const params: CodeSnippetQuestionParams = {
      type: "code_snippet",
      questionIndex: 3,
      quizTitle: "Test Quiz",
      positionTitle: "Developer",
      experienceLevel: "mid",
      skills: ["Python"],
    };

    const { systemPrompt, userPrompt } = buildQuestionPrompts(params);

    expect(systemPrompt).toContain("code snippet");
    expect(userPrompt).toContain("Developer");
  });

  it("should throw error for unsupported question type", () => {
    const params = {
      type: "unsupported_type" as const,
      questionIndex: 1,
      quizTitle: "Test",
      positionTitle: "Dev",
      experienceLevel: "mid",
      skills: [],
    };

    expect(() => buildQuestionPrompts(params as any)).toThrow(
      "Unsupported question type"
    );
  });
});

describe("buildQuizSystemPrompt", () => {
  it("should generate comprehensive system prompt", () => {
    const systemPrompt = buildQuizSystemPrompt();

    expect(systemPrompt).toContain("technical recruitment expert");
    expect(systemPrompt).toContain("multiple_choice");
    expect(systemPrompt).toContain("open_question");
    expect(systemPrompt).toContain("code_snippet");
    expect(systemPrompt).toContain("Italian");
    expect(systemPrompt).toContain("JSON");
  });

  it("should include example structure", () => {
    const systemPrompt = buildQuizSystemPrompt();

    expect(systemPrompt).toContain("Example Structure");
    expect(systemPrompt).toContain("questions");
    expect(systemPrompt).toContain("correctAnswer");
  });
});

describe("buildQuizPrompt", () => {
  it("should generate quiz prompt with all parameters", () => {
    const params: GenerateQuizParams = {
      positionTitle: "Senior React Developer",
      experienceLevel: "senior",
      skills: ["React", "TypeScript", "Node.js"],
      description: "Building modern web applications",
      quizTitle: "React Assessment",
      questionCount: 5,
      difficulty: 4,
      includeMultipleChoice: true,
      includeOpenQuestions: true,
      includeCodeSnippets: true,
      instructions: "Focus on advanced patterns",
    };

    const prompt = buildQuizPrompt(params);

    expect(prompt).toContain("Senior React Developer");
    expect(prompt).toContain("senior");
    expect(prompt).toContain("React, TypeScript, Node.js");
    expect(prompt).toContain("React Assessment");
    expect(prompt).toContain("5 questions");
    expect(prompt).toContain("4/5");
    expect(prompt).toContain("multiple_choice");
    expect(prompt).toContain("open_question");
    expect(prompt).toContain("code_snippet");
    expect(prompt).toContain("Focus on advanced patterns");
  });

  it("should handle minimal parameters", () => {
    const params: GenerateQuizParams = {
      positionTitle: "Developer",
      experienceLevel: "junior",
      skills: ["JavaScript"],
      quizTitle: "Basic Quiz",
      questionCount: 3,
      difficulty: 2,
      includeMultipleChoice: true,
      includeOpenQuestions: false,
      includeCodeSnippets: false,
    };

    const prompt = buildQuizPrompt(params);

    expect(prompt).toContain("Developer");
    expect(prompt).toContain("junior");
    expect(prompt).toContain("3 questions");
    expect(prompt).toContain("multiple_choice");
    expect(prompt).not.toContain("open_question");
    expect(prompt).not.toContain("code_snippet");
  });

  it("should include previous questions when provided", () => {
    const params: GenerateQuizParams = {
      positionTitle: "Developer",
      experienceLevel: "mid",
      skills: ["Python"],
      quizTitle: "Python Quiz",
      questionCount: 5,
      difficulty: 3,
      includeMultipleChoice: true,
      includeOpenQuestions: false,
      includeCodeSnippets: false,
      previousQuestions: [
        { question: "What is a list comprehension?" },
        { question: "Explain decorators in Python" },
      ],
    };

    const prompt = buildQuizPrompt(params);

    expect(prompt).toContain("Avoid repeating");
    expect(prompt).toContain("list comprehension");
    expect(prompt).toContain("decorators");
  });
});

describe("buildPositionDescriptionPrompt", () => {
  it("should generate position description prompt", () => {
    const params: GeneratePositionDescriptionParams = {
      title: "Frontend Developer",
      experienceLevel: "senior",
      skills: ["React", "TypeScript"],
    };

    const prompt = buildPositionDescriptionPrompt(params);

    expect(prompt).toContain("Frontend Developer");
    expect(prompt).toContain("senior");
    expect(prompt).toContain("React, TypeScript");
    expect(prompt).toContain("Italian");
    expect(prompt).toContain("4-8 sentences");
  });

  it("should include optional parameters when provided", () => {
    const params: GeneratePositionDescriptionParams = {
      title: "Backend Developer",
      experienceLevel: "mid",
      skills: ["Node.js", "PostgreSQL"],
      softSkills: ["Communication", "Problem solving"],
      contractType: "Full-time",
      currentDescription: "Existing description text",
      instructions: "Emphasize remote work",
    };

    const prompt = buildPositionDescriptionPrompt(params);

    expect(prompt).toContain("Communication, Problem solving");
    expect(prompt).toContain("Full-time");
    expect(prompt).toContain("Existing description text");
    expect(prompt).toContain("Emphasize remote work");
  });

  it("should handle missing optional parameters", () => {
    const params: GeneratePositionDescriptionParams = {
      title: "Developer",
      experienceLevel: "junior",
      skills: ["JavaScript"],
    };

    const prompt = buildPositionDescriptionPrompt(params);

    expect(prompt).toContain("Not specified");
    expect(prompt).toContain("Developer");
  });
});
