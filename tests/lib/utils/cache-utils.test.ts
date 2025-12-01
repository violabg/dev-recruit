/**
 * Unit tests for lib/utils/cache-utils.ts
 *
 * Tests cache invalidation utilities
 */

import {
  CacheTags,
  entityTag,
  invalidateAllDashboardCaches,
  invalidateCandidateCache,
  invalidateEvaluationCache,
  invalidateEvaluationCacheInRouteHandler,
  invalidateInterviewCache,
  invalidatePositionCache,
  invalidatePresetCache,
  invalidateProfileCache,
  invalidateQuestionCache,
  invalidateQuizCache,
} from "@/lib/utils/cache-utils";
import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Get mocked functions
const mockedUpdateTag = vi.mocked(updateTag);
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedRevalidateTag = vi.mocked(revalidateTag);

describe("CacheTags", () => {
  it("should have all expected cache tags", () => {
    expect(CacheTags.QUIZZES).toBe("quizzes");
    expect(CacheTags.QUESTIONS).toBe("questions");
    expect(CacheTags.POSITIONS).toBe("positions");
    expect(CacheTags.CANDIDATES).toBe("candidates");
    expect(CacheTags.INTERVIEWS).toBe("interviews");
    expect(CacheTags.EVALUATIONS).toBe("evaluations");
    expect(CacheTags.PRESETS).toBe("presets");
    expect(CacheTags.DASHBOARD).toBe("dashboard");
  });
});

describe("entityTag", () => {
  it("should generate correct entity tags", () => {
    expect(entityTag.quiz("123")).toBe("quiz-123");
    expect(entityTag.question("456")).toBe("question-456");
    expect(entityTag.position("789")).toBe("positions-789");
    expect(entityTag.candidate("abc")).toBe("candidate-abc");
    expect(entityTag.interview("def")).toBe("interview-def");
    expect(entityTag.evaluation("ghi")).toBe("evaluation-ghi");
    expect(entityTag.preset("jkl")).toBe("preset-jkl");
  });

  it("should generate correct evaluation-specific tags", () => {
    expect(entityTag.evaluationInterview("int-123")).toBe(
      "evaluation-interview-int-123"
    );
    expect(entityTag.evaluationCandidate("cand-456")).toBe(
      "evaluation-candidate-cand-456"
    );
  });
});

describe("invalidateQuizCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update quiz and questions tags", () => {
    invalidateQuizCache();

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.QUIZZES);
    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.QUESTIONS);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/quizzes");
  });

  it("should invalidate specific quiz when quizId provided", () => {
    invalidateQuizCache({ quizId: "quiz-123" });

    expect(mockedUpdateTag).toHaveBeenCalledWith("quiz-quiz-123");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/quizzes/quiz-123"
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/quizzes/quiz-123/edit"
    );
  });

  it("should invalidate position when positionId provided", () => {
    invalidateQuizCache({ positionId: "pos-123" });

    expect(mockedUpdateTag).toHaveBeenCalledWith("positions-pos-123");
  });
});

describe("invalidateQuestionCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update questions tag", () => {
    invalidateQuestionCache();

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.QUESTIONS);
  });

  it("should invalidate specific question", () => {
    invalidateQuestionCache({ questionId: "q-123" });

    expect(mockedUpdateTag).toHaveBeenCalledWith("question-q-123");
  });

  it("should invalidate quiz cache when quizId provided", () => {
    invalidateQuestionCache({ quizId: "quiz-123" });

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.QUIZZES);
    expect(mockedUpdateTag).toHaveBeenCalledWith("quiz-quiz-123");
  });

  it("should invalidate favorites when isFavorite is true", () => {
    invalidateQuestionCache({ isFavorite: true });

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.QUESTIONS_FAVORITES);
    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.QUIZZES);
  });
});

describe("invalidatePositionCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update positions tag", () => {
    invalidatePositionCache();

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.POSITIONS);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/positions");
  });

  it("should invalidate specific position", () => {
    invalidatePositionCache("pos-123");

    expect(mockedUpdateTag).toHaveBeenCalledWith("positions-pos-123");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/positions/pos-123"
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/positions/pos-123/edit"
    );
  });
});

describe("invalidateCandidateCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update candidates tag", () => {
    invalidateCandidateCache();

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.CANDIDATES);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/candidates");
  });

  it("should invalidate specific candidate", () => {
    invalidateCandidateCache({ candidateId: "cand-123" });

    expect(mockedUpdateTag).toHaveBeenCalledWith("candidate-cand-123");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/candidates/cand-123"
    );
  });

  it("should invalidate position when positionId provided", () => {
    invalidateCandidateCache({ positionId: "pos-123" });

    expect(mockedUpdateTag).toHaveBeenCalledWith("positions-pos-123");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/positions/pos-123"
    );
  });
});

describe("invalidateInterviewCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update interviews tag", () => {
    invalidateInterviewCache();

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.INTERVIEWS);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/interviews");
  });

  it("should invalidate specific interview and related quiz", () => {
    invalidateInterviewCache({ interviewId: "int-123", quizId: "quiz-456" });

    expect(mockedUpdateTag).toHaveBeenCalledWith("interview-int-123");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/interviews/int-123"
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/quizzes/quiz-456"
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/quizzes/quiz-456/invite"
    );
  });
});

describe("invalidateEvaluationCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update evaluations tag", () => {
    invalidateEvaluationCache();

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.EVALUATIONS);
  });

  it("should invalidate interview evaluation", () => {
    invalidateEvaluationCache({ interviewId: "int-123" });

    expect(mockedUpdateTag).toHaveBeenCalledWith(
      "evaluation-interview-int-123"
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/interviews/int-123"
    );
  });

  it("should invalidate candidate evaluation", () => {
    invalidateEvaluationCache({ candidateId: "cand-123" });

    expect(mockedUpdateTag).toHaveBeenCalledWith(
      "evaluation-candidate-cand-123"
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/candidates/cand-123"
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/candidates/cand-123/evaluations"
    );
  });
});

describe("invalidateEvaluationCacheInRouteHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use revalidateTag instead of updateTag", () => {
    invalidateEvaluationCacheInRouteHandler();

    expect(mockedRevalidateTag).toHaveBeenCalledWith(CacheTags.EVALUATIONS, {
      expire: 0,
    });
    expect(mockedUpdateTag).not.toHaveBeenCalled();
  });

  it("should invalidate with expire: 0 option", () => {
    invalidateEvaluationCacheInRouteHandler({ interviewId: "int-123" });

    expect(mockedRevalidateTag).toHaveBeenCalledWith(
      "evaluation-interview-int-123",
      { expire: 0 }
    );
  });
});

describe("invalidatePresetCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update presets tag", () => {
    invalidatePresetCache();

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.PRESETS);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/presets");
  });

  it("should invalidate specific preset", () => {
    invalidatePresetCache("preset-123");

    expect(mockedUpdateTag).toHaveBeenCalledWith("preset-preset-123");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/presets/preset-123"
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/presets/preset-123/edit"
    );
  });
});

describe("invalidateProfileCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should revalidate profile paths", () => {
    invalidateProfileCache();

    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/profile");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/profile/edit"
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

describe("invalidateAllDashboardCaches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update all entity tags", () => {
    invalidateAllDashboardCaches();

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.QUIZZES);
    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.QUESTIONS);
    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.POSITIONS);
    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.CANDIDATES);
    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.INTERVIEWS);
    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.EVALUATIONS);
    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.PRESETS);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
