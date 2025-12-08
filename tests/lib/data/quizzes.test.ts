import {
  getQuizById,
  getQuizData,
  getQuizzes,
  getQuizzesForPosition,
  getRecentQuizIds,
  mapQuizFromPrisma,
} from "@/lib/data/quizzes";
import prisma from "@/lib/prisma";
import { describe, expect, it } from "vitest";

describe("quizzes data layer", () => {
  it("mapQuizFromPrisma maps quiz correctly", () => {
    const rec: any = {
      id: "q1",
      title: "T",
      createdAt: new Date(),
      positionId: "p1",
      position: { id: "p1", title: "P", experienceLevel: "junior" },
      timeLimit: 10,
      quizQuestions: [{ question: { id: "qq1" } }],
    };
    const mapped = mapQuizFromPrisma(rec as any);
    expect(mapped.id).toBe("q1");
    expect(mapped.questionCount).toBe(1);
  });

  it("getQuizzes returns paginated list and handles uniqueLevels", async () => {
    (prisma.quiz.findMany as any).mockResolvedValueOnce([]);
    (prisma.quiz.count as any).mockResolvedValueOnce(0);
    (prisma.position.findMany as any).mockResolvedValueOnce([
      { experienceLevel: "mid" },
    ]);
    const res = await getQuizzes({
      search: "",
      sort: "newest",
      filter: "all",
      page: 1,
      pageSize: 10,
    });
    expect(res.quizzes).toEqual([]);
    expect(res.uniqueLevels).toContain("mid");
  });

  it("getQuizData returns null for non-existent quiz", async () => {
    (prisma.quiz.findFirst as any).mockResolvedValueOnce(null);
    expect(await getQuizData("x")).toBeNull();
  });

  it("getQuizById returns quiz detail", async () => {
    (prisma.quiz.findFirst as any).mockResolvedValueOnce({
      id: "q2",
      position: {
        id: "p",
        title: "P",
        experienceLevel: "mid",
        skills: [],
        description: null,
      },
      quizQuestions: [],
      createdAt: new Date(),
    });
    const result = await getQuizById("q2");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("q2");
  });

  it("getQuizzesForPosition returns quizzes for position", async () => {
    (prisma.quiz.findMany as any).mockResolvedValueOnce([
      { id: "q3", quizQuestions: [], createdAt: new Date() },
    ]);
    const list = await getQuizzesForPosition("p1");
    expect(list[0].id).toBe("q3");
  });

  it("getRecentQuizIds returns recent quiz IDs", async () => {
    (prisma.quiz.findMany as any).mockResolvedValueOnce([{ id: "rq1" }]);
    expect(await getRecentQuizIds(1)).toEqual(["rq1"]);
  });
});
