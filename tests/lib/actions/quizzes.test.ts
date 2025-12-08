import {
  deleteQuiz,
  deleteQuizById,
  duplicateQuizAction,
  generateNewQuestionAction,
  generateNewQuizAction,
  regenerateQuizAction,
  upsertQuizAction,
} from "@/lib/actions/quizzes";
import prisma from "@/lib/prisma";
import { aiQuizService } from "@/lib/services/ai-service";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
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
      });

      expect(result).toEqual(mockQuizData);
      expect(aiQuizService.generateQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          positionTitle: "Senior Developer",
          experienceLevel: "Senior",
          questionCount: 5,
          difficulty: 3,
        })
      );
    });

    it("throws error when position not found", async () => {
      vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

      await expect(
        generateNewQuizAction({
          positionId: "invalid",
          quizTitle: "Test",
          questionCount: 5,
          difficulty: 3,
          includeMultipleChoice: true,
          includeOpenQuestions: false,
          includeCodeSnippets: false,
        })
      ).rejects.toThrow();
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
        previousQuestions,
      });

      expect(aiQuizService.generateQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          previousQuestions,
        })
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
        specificModel: "claude-3-5-sonnet-20241022",
      });

      expect(aiQuizService.generateQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          specificModel: "claude-3-5-sonnet-20241022",
        })
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
        mockQuestion
      );

      const result = await generateNewQuestionAction({
        type: "multiple_choice",
        positionTitle: "Frontend Developer",
        experienceLevel: "Mid",
        skills: ["React"],
        difficulty: 3,
      });

      expect(result).toEqual(mockQuestion);
      expect(aiQuizService.generateQuestion).toHaveBeenCalledWith({
        type: "multiple_choice",
        positionTitle: "Frontend Developer",
        experienceLevel: "Mid",
        skills: ["React"],
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
        mockQuestion
      );

      const result = await generateNewQuestionAction({
        type: "open_question",
        positionTitle: "JavaScript Developer",
        experienceLevel: "Senior",
        skills: ["JavaScript"],
        difficulty: 4,
      });

      expect(result.type).toBe("open_question");
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
        mockQuestion
      );

      const result = await generateNewQuestionAction({
        type: "code_snippet",
        positionTitle: "Backend Developer",
        experienceLevel: "Senior",
        skills: ["Node.js"],
        difficulty: 5,
      });

      expect(result.type).toBe("code_snippet");
    });

    it("throws error on validation failure", async () => {
      const invalidQuestion = {
        type: "multiple_choice" as const,
        question: "Test",
        options: ["A"], // Invalid: needs 4+ options
        correctAnswer: 0,
      };

      vi.mocked(aiQuizService.generateQuestion).mockResolvedValueOnce(
        invalidQuestion as any
      );

      await expect(
        generateNewQuestionAction({
          type: "multiple_choice",
          positionTitle: "Developer",
          experienceLevel: "Mid",
          skills: ["JavaScript"],
          difficulty: 3,
        })
      ).rejects.toThrow();
    });
  });

  describe("deleteQuiz and deleteQuizById", () => {
    it("deleteQuiz extracts quizId from FormData and calls deleteQuizById", async () => {
      const formData = new FormData();
      formData.append("quizId", "quiz1");

      await deleteQuiz(formData);

      expect(prisma.quiz.delete).toHaveBeenCalledWith({
        where: { id: "quiz1" },
      });
    });

    it("deleteQuizById deletes a quiz", async () => {
      await deleteQuizById("quiz1");

      expect(prisma.quiz.delete).toHaveBeenCalledWith({
        where: { id: "quiz1" },
      });
    });

    it("deleteQuizById throws error when quizId missing", async () => {
      await expect(deleteQuizById("")).rejects.toThrow();
    });

    it("deleteQuizById throws error when quiz not found", async () => {
      vi.mocked(prisma.quiz.findUnique).mockResolvedValueOnce(null);

      await expect(deleteQuizById("invalid")).rejects.toThrow();
    });

    it("deleteQuizById redirects after successful deletion", async () => {
      const { redirect } = await import("next/navigation");

      try {
        await deleteQuizById("quiz1");
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
        const formData = new FormData();
        formData.append("title", "Test Quiz");
        formData.append("positionId", "pos1");
        formData.append("questions", JSON.stringify(questions));
        formData.append("timeLimit", "30");

        const result = await upsertQuizAction(formData);

        expect(result?.id).toBe("new-quiz");
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
        const formData = new FormData();
        formData.append("title", "Test Quiz");
        formData.append("positionId", "pos1");
        formData.append("questions", JSON.stringify(questions));

        await upsertQuizAction(formData);

        expect(prisma.question.findUnique).toHaveBeenCalledWith({
          where: { id: "q1" },
          select: { id: true },
        });
      });

      it("throws error when positionId missing in create mode", async () => {
        const formData = new FormData();
        formData.append("title", "Test");
        formData.append("questions", JSON.stringify([]));

        await expect(upsertQuizAction(formData)).rejects.toThrow();
      });

      it("throws error when position not found", async () => {
        vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

        const formData = new FormData();
        formData.append("title", "Test");
        formData.append("positionId", "invalid");
        formData.append("questions", JSON.stringify([]));

        await expect(upsertQuizAction(formData)).rejects.toThrow();
      });

      it("throws error when questions are invalid JSON", async () => {
        const formData = new FormData();
        formData.append("title", "Test");
        formData.append("positionId", "pos1");
        formData.append("questions", "invalid json");

        await expect(upsertQuizAction(formData)).rejects.toThrow();
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
        const formData = new FormData();
        formData.append("quizId", "quiz1");
        formData.append("title", "Updated Quiz");
        formData.append("questions", JSON.stringify(questions));
        formData.append("timeLimit", "45");

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
        const formData = new FormData();
        formData.append("quizId", "quiz1");
        formData.append("title", "Updated");
        formData.append("questions", JSON.stringify(questions));

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
        const formData = new FormData();
        formData.append("quizId", "quiz1");
        formData.append("title", "Updated");
        formData.append("questions", JSON.stringify(questions));

        await upsertQuizAction(formData);

        expect(prisma.question.deleteMany).toHaveBeenCalled();
      });

      it("throws error when quiz not found in update mode", async () => {
        vi.mocked(prisma.quiz.findUnique).mockResolvedValueOnce(null);

        const formData = new FormData();
        formData.append("quizId", "invalid");
        formData.append("title", "Test");
        formData.append("questions", JSON.stringify([]));

        await expect(upsertQuizAction(formData)).rejects.toThrow();
      });
    });
  });

  describe("regenerateQuizAction", () => {
    it("regenerates quiz questions using AI", async () => {
      const mockQuizData = {
        title: "Regenerated Quiz",
        questions: [
          {
            type: "multiple_choice" as const,
            question: "New AI question",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 0,
          },
        ],
      };

      vi.mocked(aiQuizService.generateQuiz).mockResolvedValueOnce(mockQuizData);

      const result = await regenerateQuizAction({
        quizId: "quiz1",
        positionId: "pos1",
        quizTitle: "Regenerated",
        questionCount: 3,
        difficulty: 4,
        includeMultipleChoice: true,
        includeOpenQuestions: false,
        includeCodeSnippets: false,
      });

      expect(result?.id).toBe("quiz1");
      expect(aiQuizService.generateQuiz).toHaveBeenCalled();
      expect(prisma.quiz.update).toHaveBeenCalled();
    });

    it("throws error when quiz not found", async () => {
      vi.mocked(prisma.quiz.findUnique).mockResolvedValueOnce(null);

      await expect(
        regenerateQuizAction({
          quizId: "invalid",
          positionId: "pos1",
          quizTitle: "Test",
          questionCount: 5,
          difficulty: 3,
          includeMultipleChoice: true,
          includeOpenQuestions: false,
          includeCodeSnippets: false,
        })
      ).rejects.toThrow();
    });

    it("throws error when position not found", async () => {
      vi.mocked(prisma.position.findFirst).mockResolvedValueOnce(null);

      await expect(
        regenerateQuizAction({
          quizId: "quiz1",
          positionId: "invalid",
          quizTitle: "Test",
          questionCount: 5,
          difficulty: 3,
          includeMultipleChoice: true,
          includeOpenQuestions: false,
          includeCodeSnippets: false,
        })
      ).rejects.toThrow();
    });

    it("deletes old questions and creates new ones", async () => {
      const mockQuizData = {
        title: "New",
        questions: [
          {
            type: "open_question" as const,
            question: "New question",
            sampleAnswer: "Answer",
          },
        ],
      };

      vi.mocked(aiQuizService.generateQuiz).mockResolvedValueOnce(mockQuizData);
      vi.mocked(prisma.quizQuestion.findMany).mockResolvedValueOnce([
        { questionId: "old-q1" } as any,
      ]);

      await regenerateQuizAction({
        quizId: "quiz1",
        positionId: "pos1",
        quizTitle: "Regenerated",
        questionCount: 1,
        difficulty: 3,
        includeMultipleChoice: false,
        includeOpenQuestions: true,
        includeCodeSnippets: false,
      });

      expect(prisma.question.deleteMany).toHaveBeenCalled();
      expect(prisma.question.create).toHaveBeenCalled();
    });
  });

  describe("duplicateQuizAction", () => {
    it("duplicates a quiz to a new position", async () => {
      const formData = new FormData();
      formData.append("quizId", "quiz1");
      formData.append("newPositionId", "pos2");
      formData.append("newTitle", "Duplicated Quiz");

      vi.mocked(prisma.position.findUnique).mockResolvedValueOnce({
        id: "pos2",
      } as any);

      const result = await duplicateQuizAction(formData);

      expect(result?.id).toBe("new-quiz");
      expect(prisma.quiz.create).toHaveBeenCalled();
      expect(prisma.question.create).toHaveBeenCalled();
    });

    it("throws error when required fields missing", async () => {
      const formData = new FormData();
      formData.append("quizId", "quiz1");

      await expect(duplicateQuizAction(formData)).rejects.toThrow();
    });

    it("throws error when original quiz not found", async () => {
      vi.mocked(prisma.quiz.findUnique).mockResolvedValueOnce(null);

      const formData = new FormData();
      formData.append("quizId", "invalid");
      formData.append("newPositionId", "pos2");
      formData.append("newTitle", "Test");

      await expect(duplicateQuizAction(formData)).rejects.toThrow();
    });

    it("throws error when target position not found", async () => {
      const formData = new FormData();
      formData.append("quizId", "quiz1");
      formData.append("newPositionId", "invalid");
      formData.append("newTitle", "Test");

      // First call is for the quiz (succeeds), second is for the position (fails)
      vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

      await expect(duplicateQuizAction(formData)).rejects.toThrow();
    });

    it("copies all questions with correct order", async () => {
      const formData = new FormData();
      formData.append("quizId", "quiz1");
      formData.append("newPositionId", "pos2");
      formData.append("newTitle", "Duplicated");

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
