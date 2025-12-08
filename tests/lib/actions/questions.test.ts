import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addQuestionsToQuizAction,
  createBulkQuestionsAction,
  createQuestionAction,
  deleteQuestionAction,
  deleteQuestionFromQuizAction,
  fetchFavoriteQuestionsAction,
  linkLibraryQuestionsToQuizAction,
  removeQuestionFromQuizAction,
  reorderQuizQuestionsAction,
  saveQuestionToLibraryAction,
  saveQuestionsToLibraryAction,
  saveQuizQuestionsToLibraryAndLinkAction,
  toggleQuestionFavoriteAction,
  updateQuestionAction,
} from "../../../lib/actions/questions";

// Mock dependencies
vi.mock("../../../lib/prisma", () => ({
  default: {
    question: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    quiz: {
      findUnique: vi.fn(),
    },
    quizQuestion: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        question: {
          create: vi.fn(),
        },
        quizQuestion: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          create: vi.fn(),
          aggregate: vi.fn(),
        },
      })
    ),
  },
}));

vi.mock("../../../lib/auth-server", () => ({
  requireUser: vi.fn(() =>
    Promise.resolve({ id: "user-123", name: "Test User" })
  ),
}));

vi.mock("../../../lib/utils/cache-utils", () => ({
  invalidateQuestionCache: vi.fn(),
  invalidateQuizCache: vi.fn(),
}));

describe("questions actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createQuestionAction", () => {
    it("creates question successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreate = prisma.question.create as any;

      mockCreate.mockResolvedValueOnce({ id: "q-new" });

      const input = {
        type: "multiple_choice" as const,
        question: "Qual è il paradigma principale di React?",
        keywords: ["react", "paradigma"],
        options: ["Dichiarativo", "Imperativo", "Funzionale", "OOP"],
        correctAnswer: 0,
        explanation: "React usa un approccio dichiarativo",
        isFavorite: false,
      };

      const result = await createQuestionAction(input);

      expect(result?.success).toBe(true);
      expect(result?.question.id).toBe("q-new");
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "multiple_choice",
          question: "Qual è il paradigma principale di React?",
          createdBy: "user-123",
        }),
      });
    });

    it("creates open question with keywords", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreate = prisma.question.create as any;

      mockCreate.mockResolvedValueOnce({ id: "q-new" });

      const input = {
        type: "open_question" as const,
        question: "Spiega il Virtual DOM",
        keywords: ["virtual DOM", "diffing", "performance"],
        sampleAnswer: "Il Virtual DOM è...",
        options: [],
        isFavorite: false,
      };

      const result = await createQuestionAction(input);

      expect(result?.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "open_question",
          keywords: ["virtual DOM", "diffing", "performance"],
          sampleAnswer: "Il Virtual DOM è...",
        }),
      });
    });

    it("creates code snippet question", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreate = prisma.question.create as any;

      mockCreate.mockResolvedValueOnce({ id: "q-new" });

      const input = {
        type: "code_snippet" as const,
        question: "Trova il bug nel codice",
        keywords: [],
        language: "javascript",
        codeSnippet:
          "for (var i = 0; i < 5; i++) { setTimeout(() => console.log(i), 100); }",
        sampleSolution:
          "for (let i = 0; i < 5; i++) { setTimeout(() => console.log(i), 100); }",
        options: [],
        isFavorite: false,
      };

      const result = await createQuestionAction(input);

      expect(result?.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "code_snippet",
          language: "javascript",
          codeSnippet: expect.any(String),
        }),
      });
    });

    it("invalidates cache after creation", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidateQuestionCache } = await import(
        "../../../lib/utils/cache-utils"
      );
      const mockCreate = prisma.question.create as any;

      mockCreate.mockResolvedValueOnce({ id: "q-new" });

      const input = {
        type: "multiple_choice" as const,
        question: "Test",
        keywords: [],
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
        isFavorite: false,
      };

      await createQuestionAction(input);

      expect(invalidateQuestionCache).toHaveBeenCalledWith({
        questionId: "q-new",
      });
    });
  });

  describe("updateQuestionAction", () => {
    it("updates question successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.question.findUnique as any;
      const mockUpdate = prisma.question.update as any;

      mockFindUnique.mockResolvedValueOnce({ id: "q1" });
      mockUpdate.mockResolvedValueOnce({ id: "q1" });

      const input = {
        id: "q1",
        question: "Updated question text",
      };

      const result = await updateQuestionAction(input);

      expect(result?.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "q1" },
        data: expect.objectContaining({
          question: "Updated question text",
        }),
      });
    });

    it("throws error when question not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.question.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      const input = {
        id: "invalid-id",
        question: "Updated",
      };

      await expect(updateQuestionAction(input)).rejects.toThrow();
    });

    it("invalidates cache after update", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidateQuestionCache } = await import(
        "../../../lib/utils/cache-utils"
      );
      const mockFindUnique = prisma.question.findUnique as any;
      const mockUpdate = prisma.question.update as any;

      mockFindUnique.mockResolvedValueOnce({ id: "q1" });
      mockUpdate.mockResolvedValueOnce({ id: "q1" });

      await updateQuestionAction({ id: "q1", question: "Updated" });

      expect(invalidateQuestionCache).toHaveBeenCalledWith({
        questionId: "q1",
      });
    });
  });

  describe("deleteQuestionAction", () => {
    it("deletes question successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.question.findUnique as any;
      const mockDelete = prisma.question.delete as any;

      mockFindUnique.mockResolvedValueOnce({ id: "q1" });
      mockDelete.mockResolvedValueOnce({ id: "q1" });

      const result = await deleteQuestionAction("q1");

      expect(result?.success).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "q1" } });
    });

    it("throws error when question not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.question.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      await expect(deleteQuestionAction("invalid-id")).rejects.toThrow();
    });

    it("throws error when questionId is missing", async () => {
      await expect(deleteQuestionAction("")).rejects.toThrow();
    });
  });

  describe("toggleQuestionFavoriteAction", () => {
    it("toggles favorite from false to true", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.question.findUnique as any;
      const mockUpdate = prisma.question.update as any;

      mockFindUnique.mockResolvedValueOnce({ id: "q1", isFavorite: false });
      mockUpdate.mockResolvedValueOnce({ id: "q1", isFavorite: true });

      const result = await toggleQuestionFavoriteAction("q1");

      expect(result?.success).toBe(true);
      expect(result?.isFavorite).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "q1" },
        data: { isFavorite: true },
      });
    });

    it("toggles favorite from true to false", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.question.findUnique as any;
      const mockUpdate = prisma.question.update as any;

      mockFindUnique.mockResolvedValueOnce({ id: "q1", isFavorite: true });
      mockUpdate.mockResolvedValueOnce({ id: "q1", isFavorite: false });

      const result = await toggleQuestionFavoriteAction("q1");

      expect(result?.isFavorite).toBe(false);
    });

    it("throws error when question not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.question.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      await expect(
        toggleQuestionFavoriteAction("invalid-id")
      ).rejects.toThrow();
    });
  });

  describe("addQuestionsToQuizAction", () => {
    it("adds questions to quiz successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockQuizFind = prisma.quiz.findUnique as any;
      const mockAggregate = prisma.quizQuestion.aggregate as any;
      const mockCreate = prisma.quizQuestion.create as any;

      mockQuizFind.mockResolvedValueOnce({ id: "quiz1" });
      mockAggregate.mockResolvedValueOnce({ _max: { order: 2 } });
      mockCreate.mockResolvedValue({ id: "link1" });

      const result = await addQuestionsToQuizAction("quiz1", [
        "q1",
        "q2",
        "q3",
      ]);

      expect(result?.success).toBe(true);
      expect(result?.addedCount).toBe(3);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it("handles empty quiz (order starts at 0)", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockQuizFind = prisma.quiz.findUnique as any;
      const mockAggregate = prisma.quizQuestion.aggregate as any;
      const mockCreate = prisma.quizQuestion.create as any;

      mockQuizFind.mockResolvedValueOnce({ id: "quiz1" });
      mockAggregate.mockResolvedValueOnce({ _max: { order: null } });
      mockCreate.mockResolvedValue({ id: "link1" });

      await addQuestionsToQuizAction("quiz1", ["q1"]);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          quizId: "quiz1",
          questionId: "q1",
          order: 0,
        },
      });
    });

    it("skips duplicate questions", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockQuizFind = prisma.quiz.findUnique as any;
      const mockAggregate = prisma.quizQuestion.aggregate as any;
      const mockCreate = prisma.quizQuestion.create as any;

      mockQuizFind.mockResolvedValueOnce({ id: "quiz1" });
      mockAggregate.mockResolvedValueOnce({ _max: { order: 0 } });
      mockCreate
        .mockResolvedValueOnce({ id: "link1" })
        .mockRejectedValueOnce(new Error("Unique constraint"))
        .mockResolvedValueOnce({ id: "link3" });

      const result = await addQuestionsToQuizAction("quiz1", [
        "q1",
        "q2",
        "q3",
      ]);

      expect(result?.addedCount).toBe(2);
    });

    it("throws error when quiz not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockQuizFind = prisma.quiz.findUnique as any;

      mockQuizFind.mockResolvedValueOnce(null);

      await expect(
        addQuestionsToQuizAction("invalid", ["q1"])
      ).rejects.toThrow();
    });
  });

  describe("removeQuestionFromQuizAction", () => {
    it("removes question from quiz", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDeleteMany = prisma.quizQuestion.deleteMany as any;

      mockDeleteMany.mockResolvedValueOnce({ count: 1 });

      const result = await removeQuestionFromQuizAction("quiz1", "q1");

      expect(result?.success).toBe(true);
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { quizId: "quiz1", questionId: "q1" },
      });
    });
  });

  describe("deleteQuestionFromQuizAction", () => {
    it("only unlinks favorite question", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.question.findUnique as any;
      const mockDeleteMany = prisma.quizQuestion.deleteMany as any;

      mockFindUnique.mockResolvedValueOnce({ id: "q1", isFavorite: true });
      mockDeleteMany.mockResolvedValueOnce({ count: 1 });

      const result = await deleteQuestionFromQuizAction("quiz1", "q1");

      expect(result?.success).toBe(true);
      expect(result?.wasDeleted).toBe(false);
      expect(result?.wasFavorite).toBe(true);
      expect(mockDeleteMany).toHaveBeenCalled();
    });

    it("deletes non-favorite question entity", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.question.findUnique as any;
      const mockDelete = prisma.question.delete as any;

      mockFindUnique.mockResolvedValueOnce({ id: "q1", isFavorite: false });
      mockDelete.mockResolvedValueOnce({ id: "q1" });

      const result = await deleteQuestionFromQuizAction("quiz1", "q1");

      expect(result?.wasDeleted).toBe(true);
      expect(result?.wasFavorite).toBe(false);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "q1" } });
    });
  });

  describe("reorderQuizQuestionsAction", () => {
    it("reorders questions successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockTransaction = prisma.$transaction as any;

      mockTransaction.mockImplementation((operations: any[]) =>
        Promise.all(operations.map((op: any) => Promise.resolve({ count: 1 })))
      );

      const result = await reorderQuizQuestionsAction("quiz1", [
        "q3",
        "q1",
        "q2",
      ]);

      expect(result?.success).toBe(true);
      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe("createBulkQuestionsAction", () => {
    it("creates multiple questions", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreateMany = prisma.question.createMany as any;

      mockCreateMany.mockResolvedValueOnce({ count: 3 });

      const questions = [
        {
          type: "multiple_choice" as const,
          question: "Q1",
          keywords: [],
          options: ["A", "B", "C", "D"],
          correctAnswer: 0,
          isFavorite: false,
        },
        {
          type: "open_question" as const,
          question: "Q2",
          keywords: [],
          sampleAnswer: "Answer",
          options: [],
          isFavorite: false,
        },
        {
          type: "code_snippet" as const,
          question: "Q3",
          keywords: [],
          language: "js",
          codeSnippet: "code",
          sampleSolution: "fixed code",
          options: [],
          isFavorite: false,
        },
      ];

      const result = await createBulkQuestionsAction(questions);

      expect(result?.success).toBe(true);
      expect(result?.count).toBe(3);
    });
  });

  describe("saveQuestionToLibraryAction", () => {
    it("saves question as non-favorite", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreate = prisma.question.create as any;

      mockCreate.mockResolvedValueOnce({ id: "q-new" });

      const question = {
        type: "multiple_choice" as const,
        question: "Test question",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 0,
      };

      const result = await saveQuestionToLibraryAction(question, false);

      expect(result?.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ isFavorite: false }),
      });
    });

    it("saves question as favorite", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreate = prisma.question.create as any;

      mockCreate.mockResolvedValueOnce({ id: "q-new" });

      const question = {
        type: "open_question" as const,
        question: "Test question",
        sampleAnswer: "Sample answer",
      };

      const result = await saveQuestionToLibraryAction(question, true);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ isFavorite: true }),
      });
    });
  });

  describe("saveQuestionsToLibraryAction", () => {
    it("saves multiple questions", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreate = prisma.question.create as any;

      mockCreate
        .mockResolvedValueOnce({ id: "q1" })
        .mockResolvedValueOnce({ id: "q2" });

      const questions = [
        {
          type: "multiple_choice" as const,
          question: "Question 1",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: 0,
        },
        {
          type: "open_question" as const,
          question: "Question 2",
          sampleAnswer: "Answer",
        },
      ];

      const result = await saveQuestionsToLibraryAction(questions, false);

      expect(result?.success).toBe(true);
      expect(result?.count).toBe(2);
      expect(result?.questionIds).toEqual(["q1", "q2"]);
    });
  });

  describe("saveQuizQuestionsToLibraryAndLinkAction", () => {
    it("saves questions and links to quiz", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockQuizFind = prisma.quiz.findUnique as any;
      const mockTransaction = prisma.$transaction as any;

      mockQuizFind.mockResolvedValueOnce({ id: "quiz1" });
      mockTransaction.mockImplementation(async (callback: any) => {
        const tx = {
          question: { create: vi.fn().mockResolvedValue({ id: "q1" }) },
          quizQuestion: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      const questions = [
        {
          type: "multiple_choice" as const,
          question: "Test question",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: 0,
        },
      ];

      const result = await saveQuizQuestionsToLibraryAndLinkAction(
        "quiz1",
        questions
      );

      expect(result?.success).toBe(true);
      expect(result?.count).toBe(1);
    });

    it("throws error when quiz not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockQuizFind = prisma.quiz.findUnique as any;

      mockQuizFind.mockResolvedValueOnce(null);

      await expect(
        saveQuizQuestionsToLibraryAndLinkAction("invalid", [])
      ).rejects.toThrow();
    });
  });

  describe("linkLibraryQuestionsToQuizAction", () => {
    it("links questions to quiz", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockQuizFind = prisma.quiz.findUnique as any;
      const mockQuestionFind = prisma.question.findMany as any;
      const mockTransaction = prisma.$transaction as any;

      mockQuizFind.mockResolvedValueOnce({ id: "quiz1" });
      mockQuestionFind.mockResolvedValueOnce([{ id: "q1" }, { id: "q2" }]);
      mockTransaction.mockImplementation(async (callback: any) => {
        const tx = {
          quizQuestion: {
            deleteMany: vi.fn(),
            aggregate: vi.fn().mockResolvedValue({ _max: { order: null } }),
            create: vi.fn().mockResolvedValue({ id: "link1" }),
          },
        };
        return callback(tx);
      });

      const result = await linkLibraryQuestionsToQuizAction(
        "quiz1",
        ["q1", "q2"],
        false
      );

      expect(result?.success).toBe(true);
    });

    it("clears existing links when requested", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockQuizFind = prisma.quiz.findUnique as any;
      const mockQuestionFind = prisma.question.findMany as any;
      const mockTransaction = prisma.$transaction as any;

      mockQuizFind.mockResolvedValueOnce({ id: "quiz1" });
      mockQuestionFind.mockResolvedValueOnce([{ id: "q1" }]);

      let deleteCalled = false;
      mockTransaction.mockImplementation(async (callback: any) => {
        const tx = {
          quizQuestion: {
            deleteMany: vi.fn(() => {
              deleteCalled = true;
              return Promise.resolve({ count: 2 });
            }),
            aggregate: vi.fn().mockResolvedValue({ _max: { order: null } }),
            create: vi.fn().mockResolvedValue({ id: "link1" }),
          },
        };
        return callback(tx);
      });

      await linkLibraryQuestionsToQuizAction("quiz1", ["q1"], true);

      expect(deleteCalled).toBe(true);
    });

    it("throws error when some questions not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockQuizFind = prisma.quiz.findUnique as any;
      const mockQuestionFind = prisma.question.findMany as any;

      mockQuizFind.mockResolvedValueOnce({ id: "quiz1" });
      mockQuestionFind.mockResolvedValueOnce([{ id: "q1" }]); // Only 1 out of 2

      await expect(
        linkLibraryQuestionsToQuizAction("quiz1", ["q1", "q2"], false)
      ).rejects.toThrow();
    });
  });

  describe("fetchFavoriteQuestionsAction", () => {
    it("fetches favorite questions with pagination", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindMany = prisma.question.findMany as any;
      const mockCount = prisma.question.count as any;

      mockFindMany.mockResolvedValueOnce([
        { id: "q1", isFavorite: true },
        { id: "q2", isFavorite: true },
      ]);
      mockCount.mockResolvedValueOnce(10);

      const result = await fetchFavoriteQuestionsAction(1, 5);

      expect(result?.success).toBe(true);
      expect(result?.questions).toHaveLength(2);
      expect(result?.pagination).toEqual({
        page: 1,
        limit: 5,
        total: 10,
        totalPages: 2,
      });
    });

    it("handles pagination correctly", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindMany = prisma.question.findMany as any;
      const mockCount = prisma.question.count as any;

      mockFindMany.mockResolvedValueOnce([]);
      mockCount.mockResolvedValueOnce(25);

      await fetchFavoriteQuestionsAction(3, 10);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { isFavorite: true },
        orderBy: { createdAt: "desc" },
        skip: 20,
        take: 10,
      });
    });
  });
});
