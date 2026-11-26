import {
  getQuizById,
  getQuizData,
  getQuizPickerOptions,
  getQuizzes,
  getQuizzesForPosition,
  getRecentQuizIds,
  mapQuizFromPrisma,
} from "@/lib/data/quizzes";
import prisma from "@/lib/prisma";
import { CacheTags } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";
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

describe("getQuizPickerOptions", () => {
  const createdAt = new Date("2026-02-01T00:00:00Z");
  const typeLink = (type: string) => ({ question: { type } });

  it("maps every quiz to a light option with count and distinct types in enum order", async () => {
    (prisma.quiz.findMany as any).mockResolvedValueOnce([
      {
        id: "q1",
        title: "Quiz React",
        timeLimit: 30,
        createdAt,
        position: {
          id: "p1",
          title: "Frontend",
          experienceLevel: "senior",
          status: "closed",
        },
        quizQuestions: [
          typeLink("code_snippet"),
          typeLink("multiple_choice"),
          typeLink("code_snippet"),
        ],
      },
      {
        id: "q2",
        title: "Vuoto",
        timeLimit: null,
        createdAt,
        position: {
          id: "p2",
          title: "Backend",
          experienceLevel: "junior",
          status: "draft",
        },
        quizQuestions: [],
      },
    ]);

    expect(await getQuizPickerOptions()).toEqual([
      {
        id: "q1",
        title: "Quiz React",
        timeLimit: 30,
        createdAt,
        questionCount: 3,
        questionTypes: ["multiple_choice", "code_snippet"],
        position: {
          id: "p1",
          title: "Frontend",
          experienceLevel: "senior",
          status: "closed",
        },
      },
      {
        id: "q2",
        title: "Vuoto",
        timeLimit: null,
        createdAt,
        questionCount: 0,
        questionTypes: [],
        position: {
          id: "p2",
          title: "Backend",
          experienceLevel: "junior",
          status: "draft",
        },
      },
    ]);
  });

  it("orders all four types by the enum", async () => {
    (prisma.quiz.findMany as any).mockResolvedValueOnce([
      {
        id: "q1",
        title: "Misto",
        timeLimit: null,
        createdAt,
        position: { id: "p1", title: "P", experienceLevel: "mid", status: "open" },
        quizQuestions: [
          typeLink("behavioral_scenario"),
          typeLink("code_snippet"),
          typeLink("open_question"),
          typeLink("multiple_choice"),
        ],
      },
    ]);

    const [option] = await getQuizPickerOptions();
    expect(option.questionTypes).toEqual([
      "multiple_choice",
      "open_question",
      "code_snippet",
      "behavioral_scenario",
    ]);
  });

  it("reads every quiz, newest first, with no filter by author or position", async () => {
    (prisma.quiz.findMany as any).mockResolvedValueOnce([]);

    await getQuizPickerOptions();

    const args = (prisma.quiz.findMany as any).mock.calls[0][0];
    expect(args).not.toHaveProperty("where");
    expect(args).toEqual({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        timeLimit: true,
        createdAt: true,
        position: {
          select: { id: true, title: true, experienceLevel: true, status: true },
        },
        quizQuestions: { select: { question: { select: { type: true } } } },
      },
    });
  });

  it("is cached for hours and tagged with quizzes, questions and positions", async () => {
    (prisma.quiz.findMany as any).mockResolvedValueOnce([]);

    await getQuizPickerOptions();

    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith(
      CacheTags.QUIZZES,
      CacheTags.QUESTIONS,
      CacheTags.POSITIONS,
    );
  });
});
