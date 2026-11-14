import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { getFavoriteQuestions } from "@/lib/data/questions";
import { CacheTags } from "@/lib/utils/cache-utils";
import { cacheTag } from "next/cache";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFavoriteQuestions", () => {
  it("reads only favorite questions, most recent first", async () => {
    const favorites = [
      { id: "q1", isFavorite: true },
      { id: "q2", isFavorite: true },
    ];
    vi.mocked(prisma.question.findMany).mockResolvedValueOnce(
      favorites as any,
    );

    const result = await getFavoriteQuestions();

    expect(result).toEqual(favorites);
    expect(prisma.question.findMany).toHaveBeenCalledWith({
      where: { isFavorite: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("declares the QUESTIONS collection tag", async () => {
    vi.mocked(prisma.question.findMany).mockResolvedValueOnce([]);

    await getFavoriteQuestions();

    expect(vi.mocked(cacheTag)).toHaveBeenCalledWith(CacheTags.QUESTIONS);
  });
});
