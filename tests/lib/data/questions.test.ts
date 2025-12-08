import {
  getAvailableQuestionsForQuiz,
  getFavoriteQuestions,
  getFavoritesCount,
  getLinkedQuestionIds,
  getQuestionById,
  getQuestions,
  getQuestionsCount,
  getQuestionsCountByType,
  getQuizQuestions,
  getRecentQuestions,
  searchQuestions,
} from "@/lib/data/questions";
import prisma from "@/lib/prisma";
import { describe, expect, it } from "vitest";

describe("questions data layer", () => {
  it("getQuestions returns paginated questions", async () => {
    (prisma.question.findMany as any).mockResolvedValueOnce([{ id: "q1" }]);
    (prisma.question.count as any).mockResolvedValueOnce(1);
    const res = await getQuestions({ page: 1, limit: 10 });
    expect(res.questions[0].id).toBe("q1");
    expect(res.pagination.total).toBe(1);
  });

  it("getQuestionById returns record or null", async () => {
    (prisma.question.findUnique as any).mockResolvedValueOnce(null);
    expect(await getQuestionById("x")).toBeNull();
    const rec = { id: "q2" };
    (prisma.question.findUnique as any).mockResolvedValueOnce(rec);
    expect(await getQuestionById("q2")).toEqual(rec);
  });

  it("favorites and counts return values", async () => {
    (prisma.question.findMany as any).mockResolvedValueOnce([{ id: "f1" }]);
    (prisma.question.count as any).mockResolvedValueOnce(1);
    const fav = await getFavoriteQuestions(1, 10);
    expect(fav.questions[0].id).toBe("f1");

    (prisma.question.groupBy as any).mockResolvedValueOnce([
      { type: "multiple_choice", _count: { id: 2 } },
    ]);
    const byType = await getQuestionsCountByType();
    expect(byType["multiple_choice"]).toBe(2);

    (prisma.question.count as any).mockResolvedValueOnce(7);
    expect(await getQuestionsCount()).toBe(7);

    (prisma.question.count as any).mockResolvedValueOnce(3);
    expect(await getFavoritesCount()).toBe(3);
  });

  it("getQuizQuestions and related helpers work", async () => {
    (prisma.quizQuestion.findMany as any).mockResolvedValueOnce([
      { question: { id: "qq1" } },
    ]);
    const quizQs = await getQuizQuestions("qq");
    expect(quizQs.length).toBe(1);

    (prisma.question.findMany as any).mockResolvedValueOnce([{ id: "s1" }]);
    const search = await searchQuestions("x", 10);
    expect(search[0].id).toBe("s1");

    (prisma.question.findMany as any).mockResolvedValueOnce([{ id: "r1" }]);
    const recent = await getRecentQuestions(1);
    expect(recent[0].id).toBe("r1");

    (prisma.quizQuestion.findMany as any).mockResolvedValueOnce([
      { questionId: "a" },
    ]);
    expect(await getLinkedQuestionIds("z")).toEqual(["a"]);

    (prisma.quizQuestion.findMany as any).mockResolvedValueOnce([
      { questionId: "a" },
    ]);
    (prisma.question.findMany as any).mockResolvedValueOnce([{ id: "b" }]);
    const avail = await getAvailableQuestionsForQuiz("z", {} as any);
    expect(avail[0].id).toBe("b");
  });
});
