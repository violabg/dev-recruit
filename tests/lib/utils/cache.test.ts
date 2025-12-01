/**
 * Tests for Cache Utilities (legacy)
 *
 * Tests for the deprecated cache utility file that re-exports from cache-utils.
 */

import { describe, expect, it, vi } from "vitest";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  updateTag: vi.fn(),
}));

import {
  CACHE_TAGS,
  getPositionCacheTag,
  getQuizCacheTag,
  getUserCacheTag,
  revalidatePositionCache,
  revalidateQuizCache,
  revalidateUserCache,
} from "@/lib/utils/cache";
import { revalidatePath } from "next/cache";

describe("CACHE_TAGS", () => {
  it("should export cache tag constants", () => {
    expect(CACHE_TAGS.QUIZ_DATA).toBe("quiz-data");
    expect(CACHE_TAGS.POSITION_DATA).toBe("position-data");
    expect(CACHE_TAGS.USER_DATA).toBe("user-data");
  });
});

describe("getQuizCacheTag", () => {
  it("should generate quiz cache tag", () => {
    expect(getQuizCacheTag("quiz-123")).toBe("quiz-quiz-123");
  });

  it("should handle different quiz IDs", () => {
    expect(getQuizCacheTag("abc")).toBe("quiz-abc");
    expect(getQuizCacheTag("xyz-789")).toBe("quiz-xyz-789");
  });
});

describe("getPositionCacheTag", () => {
  it("should generate position cache tag", () => {
    expect(getPositionCacheTag("pos-456")).toBe("position-pos-456");
  });

  it("should handle different position IDs", () => {
    expect(getPositionCacheTag("abc")).toBe("position-abc");
    expect(getPositionCacheTag("def-123")).toBe("position-def-123");
  });
});

describe("getUserCacheTag", () => {
  it("should generate user cache tag", () => {
    expect(getUserCacheTag("user-789")).toBe("user-user-789");
  });

  it("should handle different user IDs", () => {
    expect(getUserCacheTag("abc")).toBe("user-abc");
    expect(getUserCacheTag("xyz")).toBe("user-xyz");
  });
});

describe("revalidateQuizCache", () => {
  it("should revalidate quiz list path", () => {
    revalidateQuizCache();

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/quizzes");
  });

  it("should revalidate specific quiz paths when ID provided", () => {
    revalidateQuizCache("quiz-123");

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/quizzes");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/quizzes/quiz-123");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/dashboard/quizzes/quiz-123/edit"
    );
  });
});

describe("revalidatePositionCache", () => {
  it("should revalidate position list path", () => {
    revalidatePositionCache();

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/positions");
  });

  it("should revalidate specific position paths when ID provided", () => {
    revalidatePositionCache("pos-456");

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/positions");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/positions/pos-456");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/dashboard/positions/pos-456/edit"
    );
  });
});

describe("revalidateUserCache", () => {
  it("should revalidate dashboard paths", () => {
    revalidateUserCache();

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/profile");
  });

  it("should accept userId parameter for future expansion", () => {
    // Currently userId is accepted but not used for additional revalidations
    revalidateUserCache("user-789");

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/profile");
  });
});

describe("re-exports from cache-utils", () => {
  it("should re-export CacheTags", async () => {
    const cache = await import("@/lib/utils/cache");
    expect(cache.CacheTags).toBeDefined();
  });

  it("should re-export entityTag", async () => {
    const cache = await import("@/lib/utils/cache");
    expect(cache.entityTag).toBeDefined();
  });

  it("should re-export invalidation helpers", async () => {
    const cache = await import("@/lib/utils/cache");
    expect(cache.invalidateQuizCache).toBeDefined();
    expect(cache.invalidatePositionCache).toBeDefined();
    expect(cache.invalidateCandidateCache).toBeDefined();
    expect(cache.invalidateInterviewCache).toBeDefined();
    expect(cache.invalidateEvaluationCache).toBeDefined();
    expect(cache.invalidatePresetCache).toBeDefined();
    expect(cache.invalidateProfileCache).toBeDefined();
    expect(cache.invalidateQuestionCache).toBeDefined();
  });
});
