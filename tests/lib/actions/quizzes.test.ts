import {
  addExistingQuizzesToPositionAction,
  deleteQuizAction,
  duplicateQuizAction,
  generateNewQuestionAction,
  generateNewQuizAction,
  upsertQuizAction,
} from "@/lib/actions/quizzes";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { unwrap } from "@/lib/utils/action-result";
import { invalidateQuizCache } from "@/lib/utils/cache-utils";
import { aiQuizService } from "@/lib/services/ai-service";
import {
  addExistingQuizzesToPosition,
  saveQuiz,
} from "@/lib/services/quizzes";
import { UserError } from "@/lib/services/user-error";
import { mockOpenQuestion } from "@/tests/mocks";

// File-level Prisma mock: the quiz actions also read the scorecard criteria,
// which the global mock has no delegate for
vi.mock("@/lib/prisma", () => ({
  default: {
    quiz: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    question: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    quizQuestion: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    position: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    scorecardCriterion: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
}));
vi.mock("@/lib/services/ai-service", () => ({
  aiQuizService: {
    generateQuiz: vi.fn(),
    generateQuestion: vi.fn(),
  },
}));
vi.mock("@/lib/services/quizzes", async (importOriginal) => ({
  // copyQuizToPosition stays real: the duplicate tests assert its writes
  ...(await importOriginal<typeof import("@/lib/services/quizzes")>()),
  saveQuiz: vi.fn(),
  addExistingQuizzesToPosition: vi.fn(),
}));
vi.mock("@/lib/utils/cache-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/utils/cache-utils")>()),
  invalidateQuizCache: vi.fn(),
}));

describe("quizzes actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(prisma.position.findUnique).mockResolvedValue({
      id: "pos1",
      title: "Senior Developer",
      experienceLevel: "Senior",
      skills: ["JavaScript", "TypeScript"],
      description: "Test position",
    } as any);

    vi.mocked(prisma.position.findFirst).mockResolvedValue({
      id: "pos1",
      title: "Senior Developer",
      experienceLevel: "Senior",
      skills: ["JavaScript", "TypeScript"],
      description: "Test position",
    } as any);

    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
      id: "quiz1",
      positionId: "pos1",
      title: "Test Quiz",
      timeLimit: 30,
      quizQuestions: [
        {
          order: 0,
          questionId: "q1",
          question: {
            id: "q1",
            type: "multiple_choice",
            question: "Test question",
            keywords: [],
            explanation: null,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 0,
            sampleAnswer: null,
            codeSnippet: null,
            sampleSolution: null,
            language: null,
            isFavorite: false,
          },
        },
      ],
    } as any);

    vi.mocked(prisma.quiz.create).mockResolvedValue({ id: "new-quiz" } as any);
    vi.mocked(prisma.quiz.update).mockResolvedValue({ id: "quiz1" } as any);
    vi.mocked(prisma.quiz.delete).mockResolvedValue({ id: "quiz1" } as any);
    vi.mocked(prisma.question.findUnique).mockResolvedValue({
      id: "q1",
    } as any);
    vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    vi.mocked(prisma.question.create).mockResolvedValue({ id: "q-new" } as any);
    vi.mocked(prisma.question.update).mockResolvedValue({ id: "q1" } as any);
    vi.mocked(prisma.question.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue([]);
    vi.mocked(prisma.quizQuestion.create).mockResolvedValue({
      id: "qq1",
    } as any);
    vi.mocked(prisma.quizQuestion.deleteMany).mockResolvedValue({ count: 0 });
    // No scorecard by default
    vi.mocked(prisma.scorecardCriterion.findMany).mockResolvedValue([]);

    // Mock transaction
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const tx = {
        quiz: {
          create: prisma.quiz.create,
          update: prisma.quiz.update,
          findUnique: prisma.quiz.findUnique,
        },
        question: {
          create: prisma.question.create,
          update: prisma.question.update,
          findUnique: prisma.question.findUnique,
          deleteMany: prisma.question.deleteMany,
        },
        quizQuestion: {
          create: prisma.quizQuestion.create,
          findMany: prisma.quizQuestion.findMany,
          deleteMany: prisma.quizQuestion.deleteMany,
        },
      };
      return callback(tx);
    });
  });

  describe("generateNewQuizAction", () => {
    it("generates a quiz successfully", async () => {
      const mockQuizData = {
        title: "AI Generated Quiz",
        questions: [
          {
            type: "multiple_choice" as const,
            question: "What is TypeScript?",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 0,
          },
        ],
      };

      vi.mocked(aiQuizService.generateQuiz).mockResolvedValueOnce(mockQuizData);

      const result = await generateNewQuizAction({
        positionId: "pos1",
        quizTitle: "Test Quiz",
        questionCount: 5,
        difficulty: 3,
        includeMultipleChoice: true,
        includeOpenQuestions: false,
        includeCodeSnippets: false,
        includeBehavioralScenarios: false,
      });

      expect(result).toEqual({ ...mockQuizData, success: true });
      expect(aiQuizService.generateQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          positionTitle: "Senior Developer",
          experienceLevel: "Senior",
          questionCount: 5,
          difficulty: 3,
        }),
      );
    });

    it("throws error when position not found", async () => {
      vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

      expect(await generateNewQuizAction({
          positionId: "invalid",
          quizTitle: "Test",
          questionCount: 5,
          difficulty: 3,
          includeMultipleChoice: true,
          includeOpenQuestions: false,
          includeCodeSnippets: false,
          includeBehavioralScenarios: false,
        }),).toMatchObject({ success: false });
    });

    it("handles AI generation with previousQuestions", async () => {
      const mockQuizData = { title: "Quiz", questions: [] };
      vi.mocked(aiQuizService.generateQuiz).mockResolvedValueOnce(mockQuizData);

      const previousQuestions = [{ question: "Previous question 1" }];

      await generateNewQuizAction({
        positionId: "pos1",
        quizTitle: "Test",
        questionCount: 5,
        difficulty: 3,
        includeMultipleChoice: true,
        includeOpenQuestions: false,
        includeCodeSnippets: false,
        includeBehavioralScenarios: false,
        previousQuestions,
      });

      expect(aiQuizService.generateQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          previousQuestions,
        }),
      );
    });

    it("handles AI generation with specific model", async () => {
      const mockQuizData = { title: "Quiz", questions: [] };
      vi.mocked(aiQuizService.generateQuiz).mockResolvedValueOnce(mockQuizData);

      await generateNewQuizAction({
        positionId: "pos1",
        quizTitle: "Test",
        questionCount: 5,
        difficulty: 3,
        includeMultipleChoice: true,
        includeOpenQuestions: false,
        includeCodeSnippets: false,
        includeBehavioralScenarios: false,
        specificModel: "claude-3-5-sonnet-20241022",
      });

      expect(aiQuizService.generateQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          specificModel: "claude-3-5-sonnet-20241022",
        }),
      );
    });
  });

  describe("generateNewQuestionAction", () => {
    it("generates a multiple choice question", async () => {
      const mockQuestion = {
        type: "multiple_choice" as const,
        question: "What is React?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 0,
        keywords: [],
        explanation: "Test explanation",
      };

      vi.mocked(aiQuizService.generateQuestion).mockResolvedValueOnce(
        mockQuestion,
      );

      const result = await generateNewQuestionAction({
        type: "multiple_choice",
        positionTitle: "Frontend Developer",
        experienceLevel: "Mid",
        skills: ["React"],
        quizTitle: "Test Quiz",
        difficulty: 3,
      });

      expect(result).toEqual({ success: true, question: mockQuestion });
      expect(aiQuizService.generateQuestion).toHaveBeenCalledWith({
        type: "multiple_choice",
        positionTitle: "Frontend Developer",
        experienceLevel: "Mid",
        skills: ["React"],
        quizTitle: "Test Quiz",
        difficulty: 3,
      });
    });

    it("generates an open question", async () => {
      const mockQuestion = {
        type: "open_question" as const,
        question: "Explain closures",
        sampleAnswer: "A closure is...",
        keywords: ["closure", "scope"],
      };

      vi.mocked(aiQuizService.generateQuestion).mockResolvedValueOnce(
        mockQuestion,
      );

      const result = await generateNewQuestionAction({
        type: "open_question",
        positionTitle: "JavaScript Developer",
        experienceLevel: "Senior",
        skills: ["JavaScript"],
        quizTitle: "Test Quiz",
        difficulty: 4,
      });

      expect(unwrap(result).question.type).toBe("open_question");
    });

    it("generates a code snippet question", async () => {
      const mockQuestion = {
        type: "code_snippet" as const,
        question: "Find the bug",
        codeSnippet: "const x = 1;",
        sampleSolution: "const x = 2;",
        language: "javascript",
        keywords: [],
      };

      vi.mocked(aiQuizService.generateQuestion).mockResolvedValueOnce(
        mockQuestion,
      );

      const result = await generateNewQuestionAction({
        type: "code_snippet",
        positionTitle: "Backend Developer",
        experienceLevel: "Senior",
        skills: ["Node.js"],
        quizTitle: "Test Quiz",
        difficulty: 5,
      });

      expect(unwrap(result).question.type).toBe("code_snippet");
    });

    it("throws error on validation failure", async () => {
      const invalidQuestion = {
        type: "multiple_choice" as const,
        question: "Test",
        options: ["A"], // Invalid: needs 4+ options
        correctAnswer: 0,
      };

      vi.mocked(aiQuizService.generateQuestion).mockResolvedValueOnce(
        invalidQuestion as any,
      );

      expect(await generateNewQuestionAction({
          type: "multiple_choice",
          positionTitle: "Developer",
          experienceLevel: "Mid",
          skills: ["JavaScript"],
          quizTitle: "Test Quiz",
          difficulty: 3,
        }),).toMatchObject({ success: false });
    });
  });

  describe("deleteQuizAction", () => {
    it("deleteQuizAction deletes a quiz", async () => {
      await deleteQuizAction("quiz1");

      expect(prisma.quiz.delete).toHaveBeenCalledWith({
        where: { id: "quiz1" },
      });
    });

    it("deleteQuizAction throws error when quizId missing", async () => {
      expect(await deleteQuizAction("")).toMatchObject({ success: false });
    });

    it("deleteQuizAction throws error when quiz not found", async () => {
      vi.mocked(prisma.quiz.findUnique).mockResolvedValueOnce(null);

      expect(await deleteQuizAction("invalid")).toMatchObject({ success: false });
    });

    it("deleteQuizAction redirects after successful deletion", async () => {
      const { redirect } = await import("next/navigation");

      try {
        await deleteQuizAction("quiz1");
      } catch (error) {
        // Redirect throws an error
        expect(redirect).toHaveBeenCalledWith("/dashboard/quizzes");
      }
    });
  });

  // The save rules (create/update, criteria, question sync) are tested on
  // saveQuiz in tests/lib/services/quizzes.test.ts
  describe("upsertQuizAction", () => {
    const input = {
      title: "Test Quiz",
      positionId: "pos1",
      timeLimit: 30,
      questions: [mockOpenQuestion()],
    } as any;

    beforeEach(() => {
      vi.mocked(requireUser).mockResolvedValue({
        id: "user-123",
        role: "user",
      } as any);
    });

    it("delegates a creation to saveQuiz with the session actor and invalidates the quiz", async () => {
      vi.mocked(saveQuiz).mockResolvedValueOnce({
        quizId: "new-quiz",
        positionId: "pos1",
        created: true,
      });

      const result = await upsertQuizAction(input);

      expect(result).toEqual({ success: true, id: "new-quiz" });
      expect(saveQuiz).toHaveBeenCalledWith(
        { userId: "user-123", role: "user" },
        input,
      );
      expect(invalidateQuizCache).toHaveBeenCalledWith({
        quizId: "new-quiz",
        positionId: "pos1",
      });
    });

    it("returns the quiz id in update mode", async () => {
      vi.mocked(saveQuiz).mockResolvedValueOnce({
        quizId: "quiz1",
        positionId: "pos1",
        created: false,
      });

      const result = await upsertQuizAction({ ...input, quizId: "quiz1" });

      expect(result).toEqual({ success: true, id: "quiz1" });
      expect(invalidateQuizCache).toHaveBeenCalledWith({
        quizId: "quiz1",
        positionId: "pos1",
      });
    });

    it("returns the service refusal and invalidates nothing", async () => {
      vi.mocked(saveQuiz).mockRejectedValueOnce(
        new UserError("Quiz non trovato o accesso negato."),
      );

      const result = await upsertQuizAction({ ...input, quizId: "nope" });

      expect(result).toEqual({
        success: false,
        error: "Quiz non trovato o accesso negato.",
      });
      expect(invalidateQuizCache).not.toHaveBeenCalled();
    });

    it("returns the generic message when the transaction fails", async () => {
      vi.mocked(saveQuiz).mockRejectedValueOnce(new Error("db down"));

      const result = await upsertQuizAction(input);

      expect(result).toEqual({
        success: false,
        error: "Si è verificato un errore. Riprova.",
      });
      expect(invalidateQuizCache).not.toHaveBeenCalled();
    });

    it("requires a signed-in user", async () => {
      vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

      const result = await upsertQuizAction(input);

      expect(result).toEqual({
        success: false,
        error: "Sessione scaduta. Accedi di nuovo per continuare.",
      });
      expect(saveQuiz).not.toHaveBeenCalled();
    });
  });

  describe("duplicateQuizAction", () => {
    it("duplicates a quiz to a new position", async () => {
      const formData = { quizId: "quiz1", newPositionId: "pos2", newTitle: "Duplicated Quiz" } as any;

      vi.mocked(prisma.position.findUnique).mockResolvedValueOnce({
        id: "pos2",
      } as any);

      const result = await duplicateQuizAction(formData);

      expect(unwrap(result).id).toBe("new-quiz");
      expect(prisma.quiz.create).toHaveBeenCalled();
      expect(prisma.question.create).toHaveBeenCalled();
    });

    it("throws error when required fields missing", async () => {
      const formData = { quizId: "quiz1" } as any;

      expect(await duplicateQuizAction(formData)).toMatchObject({ success: false });
    });

    it("throws error when original quiz not found", async () => {
      vi.mocked(prisma.quiz.findUnique).mockResolvedValueOnce(null);

      const formData = { quizId: "invalid", newPositionId: "pos2", newTitle: "Test" } as any;

      expect(await duplicateQuizAction(formData)).toMatchObject({ success: false });
    });

    it("throws error when target position not found", async () => {
      const formData = { quizId: "quiz1", newPositionId: "invalid", newTitle: "Test" } as any;

      // First call is for the quiz (succeeds), second is for the position (fails)
      vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

      expect(await duplicateQuizAction(formData)).toMatchObject({ success: false });
    });

    it("copies all questions with correct order", async () => {
      const formData = { quizId: "quiz1", newPositionId: "pos2", newTitle: "Duplicated" } as any;

      vi.mocked(prisma.position.findUnique).mockResolvedValueOnce({
        id: "pos2",
      } as any);

      vi.mocked(prisma.quiz.findUnique).mockResolvedValueOnce({
        id: "quiz1",
        title: "Original",
        timeLimit: 30,
        quizQuestions: [
          {
            order: 0,
            question: {
              id: "q1",
              type: "multiple_choice",
              question: "Q1",
              keywords: [],
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: 0,
              explanation: null,
              sampleAnswer: null,
              codeSnippet: null,
              sampleSolution: null,
              language: null,
              isFavorite: false,
            },
          },
          {
            order: 1,
            question: {
              id: "q2",
              type: "open_question",
              question: "Q2",
              keywords: [],
              options: [],
              correctAnswer: null,
              explanation: null,
              sampleAnswer: "Answer",
              codeSnippet: null,
              sampleSolution: null,
              language: null,
              isFavorite: false,
            },
          },
        ],
      } as any);

      await duplicateQuizAction(formData);

      // Should create 2 questions
      expect(prisma.question.create).toHaveBeenCalledTimes(2);
      expect(prisma.quizQuestion.create).toHaveBeenCalledTimes(2);
    });
  });
});

describe("quizzes actions: criteria links", () => {
  const activeCriteria = [
    {
      id: "c-active",
      name: "React",
      description: null,
      category: "technical",
      priority: "must",
      weight: 3,
      expectedLevel: 3,
    },
  ];
  // Every criterion of the scorecard (active and archived); deleted ones are absent
  const allCriterionIds = [{ id: "c-active" }, { id: "c-archived" }];

  const linkRow = (questionId: string) => ({
    order: 0,
    questionId,
    criterionIds: ["c-archived"],
    question: {
      id: questionId,
      type: "open_question",
      question: "Domanda",
      keywords: [],
      explanation: null,
      options: [],
      correctAnswer: null,
      sampleAnswer: "Risposta",
      codeSnippet: null,
      sampleSolution: null,
      language: null,
      isFavorite: false,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.position.findUnique).mockResolvedValue({
      id: "pos1",
      title: "Senior Developer",
      experienceLevel: "Senior",
      skills: ["React"],
      description: null,
    } as any);
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
      positionId: "pos1",
      title: "Quiz",
      timeLimit: null,
      quizQuestions: [linkRow("q1")],
    } as any);
    vi.mocked(prisma.quiz.create).mockResolvedValue({ id: "new-quiz" } as any);
    vi.mocked(prisma.question.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.question.create).mockResolvedValue({ id: "q-new" } as any);
    vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue([]);
    // Active criteria (archivedAt: null) vs every criterion of the scorecard
    vi.mocked(prisma.scorecardCriterion.findMany).mockImplementation(((args: {
      where: { archivedAt?: null };
    }) =>
      Promise.resolve(
        "archivedAt" in args.where ? activeCriteria : allCriterionIds,
      )) as any);
    vi.mocked(prisma.$transaction).mockImplementation((async (
      callback: (tx: unknown) => unknown,
    ) => callback(prisma)) as any);
  });

  it("generate passes the active criteria of the position to the AI service", async () => {
    vi.mocked(aiQuizService.generateQuiz).mockResolvedValueOnce({
      questions: [],
    } as any);

    await generateNewQuizAction({
      positionId: "pos1",
      quizTitle: "Quiz",
      questionCount: 3,
      difficulty: 3,
      includeMultipleChoice: true,
      includeOpenQuestions: false,
      includeCodeSnippets: false,
      includeBehavioralScenarios: false,
    });

    expect(prisma.scorecardCriterion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scorecard: { positionId: "pos1" }, archivedAt: null },
      }),
    );
    expect(aiQuizService.generateQuiz).toHaveBeenCalledWith(
      expect.objectContaining({ criteria: activeCriteria }),
    );
    // Generation never saves
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.quizQuestion.create).not.toHaveBeenCalled();
  });

  it("duplicate keeps the criteria when the copy stays on the same position", async () => {
    await duplicateQuizAction({
      quizId: "quiz1",
      newPositionId: "pos1",
      newTitle: "Copia",
    });

    expect(prisma.quizQuestion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ criterionIds: ["c-archived"] }),
    });
    // A copy: the question is created anew, not shared
    expect(prisma.question.create).toHaveBeenCalledTimes(1);
  });

  it("duplicate clears the criteria when the copy goes to another position", async () => {
    vi.mocked(prisma.position.findUnique).mockResolvedValue({ id: "pos2" } as any);

    await duplicateQuizAction({
      quizId: "quiz1",
      newPositionId: "pos2",
      newTitle: "Copia",
    });

    expect(prisma.quizQuestion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ criterionIds: [] }),
    });
  });
});

describe("addExistingQuizzesToPositionAction", () => {
  const txClient = { marker: "tx" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
    vi.mocked(prisma.$transaction).mockImplementation((async (
      callback: (tx: unknown) => unknown,
    ) => callback(txClient)) as any);
    vi.mocked(addExistingQuizzesToPosition).mockResolvedValue({
      createdQuizIds: ["copy-1", "copy-2"],
    });
  });

  it("copies the quizzes in one transaction and invalidates each new quiz with the position", async () => {
    const result = await addExistingQuizzesToPositionAction({
      positionId: "pos-1",
      quizIds: ["quiz-a", "quiz-b"],
    });

    expect(unwrap(result)).toEqual({
      success: true,
      count: 2,
      quizIds: ["copy-1", "copy-2"],
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(addExistingQuizzesToPosition).toHaveBeenCalledWith(txClient, {
      positionId: "pos-1",
      quizIds: ["quiz-a", "quiz-b"],
      userId: "user-123",
    });
    expect(invalidateQuizCache).toHaveBeenCalledTimes(2);
    expect(invalidateQuizCache).toHaveBeenCalledWith({
      quizId: "copy-1",
      positionId: "pos-1",
    });
    expect(invalidateQuizCache).toHaveBeenCalledWith({
      quizId: "copy-2",
      positionId: "pos-1",
    });
  });

  it("accepts a single quiz", async () => {
    vi.mocked(addExistingQuizzesToPosition).mockResolvedValueOnce({
      createdQuizIds: ["copy-1"],
    });

    const result = await addExistingQuizzesToPositionAction({
      positionId: "pos-1",
      quizIds: ["quiz-a"],
    });

    expect(unwrap(result)).toEqual({
      success: true,
      count: 1,
      quizIds: ["copy-1"],
    });
    expect(invalidateQuizCache).toHaveBeenCalledTimes(1);
  });

  it("removes duplicated ids before copying, keeping the first-occurrence order", async () => {
    await addExistingQuizzesToPositionAction({
      positionId: "pos-1",
      quizIds: ["quiz-b", "quiz-a", "quiz-b"],
    });

    expect(addExistingQuizzesToPosition).toHaveBeenCalledWith(txClient, {
      positionId: "pos-1",
      quizIds: ["quiz-b", "quiz-a"],
      userId: "user-123",
    });
  });

  it("returns the expired-session message before parsing or touching the database", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await addExistingQuizzesToPositionAction({
      positionId: "pos-1",
      quizIds: [],
    });

    expect(result).toEqual({
      success: false,
      error: "Sessione scaduta. Accedi di nuovo per continuare.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(addExistingQuizzesToPosition).not.toHaveBeenCalled();
    expect(invalidateQuizCache).not.toHaveBeenCalled();
  });

  it("refuses an empty selection", async () => {
    const result = await addExistingQuizzesToPositionAction({
      positionId: "pos-1",
      quizIds: [],
    });

    expect(result).toEqual({
      success: false,
      error: "Seleziona almeno un test",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses more than 20 quizzes", async () => {
    const result = await addExistingQuizzesToPositionAction({
      positionId: "pos-1",
      quizIds: Array.from({ length: 21 }, (_, i) => `quiz-${i}`),
    });

    expect(result).toEqual({
      success: false,
      error: "Puoi aggiungere al massimo 20 test alla volta",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns the service refusal verbatim and invalidates nothing", async () => {
    vi.mocked(addExistingQuizzesToPosition).mockRejectedValueOnce(
      new UserError("Uno o più quiz non esistono più"),
    );

    const result = await addExistingQuizzesToPositionAction({
      positionId: "pos-1",
      quizIds: ["quiz-a"],
    });

    expect(result).toEqual({
      success: false,
      error: "Uno o più quiz non esistono più",
    });
    expect(invalidateQuizCache).not.toHaveBeenCalled();
  });

  it("returns the generic error on an unexpected failure", async () => {
    vi.mocked(addExistingQuizzesToPosition).mockRejectedValueOnce(
      new Error("db down"),
    );

    const result = await addExistingQuizzesToPositionAction({
      positionId: "pos-1",
      quizIds: ["quiz-a"],
    });

    expect(result).toEqual({
      success: false,
      error: "Si è verificato un errore. Riprova.",
    });
    expect(invalidateQuizCache).not.toHaveBeenCalled();
  });
});
