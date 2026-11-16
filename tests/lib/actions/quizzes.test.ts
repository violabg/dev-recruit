import {
  deleteQuizAction,
  duplicateQuizAction,
  generateNewQuestionAction,
  generateNewQuizAction,
  upsertQuizAction,
} from "@/lib/actions/quizzes";
import prisma from "@/lib/prisma";
import { unwrap } from "@/lib/utils/action-result";
import { aiQuizService } from "@/lib/services/ai-service";

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

  describe("upsertQuizAction", () => {
    describe("create mode", () => {
      it("creates a quiz with new questions", async () => {
        const questions = [
          {
            type: "multiple_choice" as const,
            question: "Test question",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 0,
          },
        ];
        const formData = { title: "Test Quiz", positionId: "pos1", questions: questions, timeLimit: 30 } as any;

        const result = await upsertQuizAction(formData);

        expect(unwrap(result).id).toBe("new-quiz");
        expect(prisma.quiz.create).toHaveBeenCalled();
      });

      it("creates a quiz linking existing questions by dbId", async () => {
        const questions = [
          {
            dbId: "q1",
            type: "multiple_choice" as const,
            question: "Test question",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 0,
          },
        ];
        const formData = { title: "Test Quiz", positionId: "pos1", questions: questions, timeLimit: null } as any;

        await upsertQuizAction(formData);

        expect(prisma.question.findUnique).toHaveBeenCalledWith({
          where: { id: "q1" },
          select: { id: true },
        });
      });

      it("throws error when positionId missing in create mode", async () => {
        const formData = { title: "Test", questions: [] } as any;

        expect(await upsertQuizAction(formData)).toMatchObject({ success: false });
      });

      it("throws error when position not found", async () => {
        vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

        const formData = { title: "Test", positionId: "invalid", questions: [] } as any;

        expect(await upsertQuizAction(formData)).toMatchObject({ success: false });
      });

      it("throws error when questions are invalid JSON", async () => {
        const formData = { title: "Test", positionId: "pos1", questions: "invalid json" as any } as any;

        expect(await upsertQuizAction(formData)).toMatchObject({ success: false });
      });
    });

    describe("update mode", () => {
      it("updates a quiz", async () => {
        const questions = [
          {
            type: "open_question" as const,
            question: "Updated question",
            sampleAnswer: "Sample answer",
          },
        ];
        const formData = { quizId: "quiz1", title: "Updated Quiz", questions: questions, timeLimit: 45 } as any;

        await upsertQuizAction(formData);

        expect(prisma.quiz.update).toHaveBeenCalledWith({
          where: { id: "quiz1" },
          data: {
            title: "Updated Quiz",
            timeLimit: 45,
          },
        });
      });

      it("updates existing questions when dbId present", async () => {
        const questions = [
          {
            dbId: "q1",
            type: "multiple_choice" as const,
            question: "Updated question",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 1,
          },
        ];
        const formData = { quizId: "quiz1", title: "Updated", questions: questions, timeLimit: null } as any;

        await upsertQuizAction(formData);

        expect(prisma.question.update).toHaveBeenCalled();
      });

      it("deletes old unlinked questions in update mode", async () => {
        vi.mocked(prisma.quizQuestion.findMany).mockResolvedValueOnce([
          { questionId: "old-q1" } as any,
        ]);

        const questions = [
          {
            type: "multiple_choice" as const,
            question: "New question",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 0,
          },
        ];
        const formData = { quizId: "quiz1", title: "Updated", questions: questions, timeLimit: null } as any;

        await upsertQuizAction(formData);

        expect(prisma.question.deleteMany).toHaveBeenCalledWith({
          where: {
            id: { in: ["old-q1"] },
            isFavorite: false,
            quizQuestions: { none: {} },
          },
        });
      });

      it("returns the quiz id in update mode", async () => {
        const result = await upsertQuizAction({
          quizId: "quiz1",
          title: "Updated",
          timeLimit: null,
          questions: [
            {
              type: "open_question",
              question: "Domanda",
              sampleAnswer: "Risposta",
            },
          ],
        } as any);

        expect(result).toEqual({ success: true, id: "quiz1" });
      });

      it("throws error when quiz not found in update mode", async () => {
        vi.mocked(prisma.quiz.findUnique).mockResolvedValueOnce(null);

        const formData = { quizId: "invalid", title: "Test", questions: [] } as any;

        expect(await upsertQuizAction(formData)).toMatchObject({ success: false });
      });
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

  const openQuestion = (criterionIds?: string[], dbId?: string) => ({
    ...(dbId ? { dbId } : {}),
    type: "open_question" as const,
    question: "Domanda",
    sampleAnswer: "Risposta",
    ...(criterionIds ? { criterionIds } : {}),
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

  it("upsert refuses a criterion that is not active on the position and saves nothing", async () => {
    vi.mocked(prisma.scorecardCriterion.findMany).mockImplementation(((args: {
      where: { archivedAt?: null };
    }) =>
      Promise.resolve(
        "archivedAt" in args.where
          ? activeCriteria
          : [...allCriterionIds, { id: "c-other-archived" }],
      )) as any);

    const result = await upsertQuizAction({
      title: "Quiz",
      positionId: "pos1",
      timeLimit: null,
      questions: [openQuestion(["c-active", "c-other-archived"])],
    } as any);

    expect(result).toEqual({
      success: false,
      error:
        "Uno o più criteri selezionati non appartengono alla scheda della posizione",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.quizQuestion.create).not.toHaveBeenCalled();
  });

  it("upsert stores the active criteria on the link", async () => {
    await upsertQuizAction({
      title: "Quiz",
      positionId: "pos1",
      timeLimit: null,
      questions: [openQuestion(["c-active"])],
    } as any);

    expect(prisma.quizQuestion.create).toHaveBeenCalledWith({
      data: {
        quizId: "new-quiz",
        questionId: "q-new",
        order: 0,
        criterionIds: ["c-active"],
      },
    });
  });

  it("upsert accepts an archived id already stored anywhere on the same quiz", async () => {
    // c-archived is stored on the link of q1; here it moves to a new question
    vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue([
      { criterionIds: ["c-archived"] },
    ] as any);

    const result = await upsertQuizAction({
      quizId: "quiz1",
      title: "Quiz",
      timeLimit: null,
      questions: [openQuestion(["c-archived", "c-active"])],
    } as any);

    expect(result).toEqual({ success: true, id: "quiz1" });
    expect(prisma.quizQuestion.findMany).toHaveBeenCalledWith({
      where: { quizId: "quiz1" },
      select: { criterionIds: true },
    });
    expect(prisma.quizQuestion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        criterionIds: ["c-archived", "c-active"],
      }),
    });
  });

  it("upsert refuses an archived id that was not already on the quiz", async () => {
    const result = await upsertQuizAction({
      title: "Quiz",
      positionId: "pos1",
      timeLimit: null,
      questions: [openQuestion(["c-archived"])],
    } as any);

    expect(result).toMatchObject({ success: false });
    expect(prisma.quizQuestion.create).not.toHaveBeenCalled();
  });

  it("upsert drops the ids of deleted criteria before saving", async () => {
    const result = await upsertQuizAction({
      title: "Quiz",
      positionId: "pos1",
      timeLimit: null,
      questions: [openQuestion(["c-deleted", "c-active"])],
    } as any);

    expect(result).toEqual({ success: true, id: "new-quiz" });
    expect(prisma.quizQuestion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ criterionIds: ["c-active"] }),
    });
  });

  it("upsert of a quiz without criteria skips the stored-links read", async () => {
    await upsertQuizAction({
      quizId: "quiz1",
      title: "Quiz",
      timeLimit: null,
      questions: [openQuestion()],
    } as any);

    expect(prisma.quizQuestion.findMany).not.toHaveBeenCalledWith({
      where: { quizId: "quiz1" },
      select: { criterionIds: true },
    });
    expect(prisma.quizQuestion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ criterionIds: [] }),
    });
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
