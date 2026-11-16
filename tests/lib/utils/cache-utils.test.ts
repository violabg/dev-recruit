/**
 * Unit tests for lib/utils/cache-utils.ts
 *
 * Tests cache invalidation utilities
 */

import {
  CacheTags,
  entityTag,
  invalidateAssessmentCache,
  invalidateBehavioralRubricCache,
  invalidateCandidateCache,
  invalidateCandidateCacheInRouteHandler,
  invalidateEvaluationCache,
  invalidateEvaluationCacheInRouteHandler,
  invalidateInterviewCache,
  invalidateInterviewGuideCache,
  invalidatePositionCache,
  invalidateScorecardCache,
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
    expect(CacheTags.ASSESSMENTS).toBe("assessments");
    expect(CacheTags.EVALUATIONS).toBe("evaluations");
    expect(CacheTags.PRESETS).toBe("presets");
    expect(CacheTags.REFERENCE_DATA).toBe("reference-data");
  });
});

describe("entityTag", () => {
  it("should generate correct entity tags", () => {
    expect(entityTag.quiz("123")).toBe("quiz-123");
    expect(entityTag.question("456")).toBe("question-456");
    expect(entityTag.position("789")).toBe("positions-789");
    expect(entityTag.candidate("abc")).toBe("candidate-abc");
    expect(entityTag.assessment("def")).toBe("assessment-def");
    expect(entityTag.evaluation("ghi")).toBe("evaluation-ghi");
    expect(entityTag.preset("jkl")).toBe("preset-jkl");
  });

  it("should generate correct evaluation-specific tags", () => {
    expect(entityTag.evaluationAssessment("ass-123")).toBe(
      "evaluation-assessment-ass-123"
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

  it("should invalidate only the questions collection without options", () => {
    invalidateQuestionCache();

    expect(mockedUpdateTag).toHaveBeenCalledTimes(1);
    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.QUESTIONS);
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

describe("invalidateCandidateCache with applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revalidates the applications list, each application and the home", () => {
    invalidateCandidateCache({
      candidateId: "cand-1",
      applicationId: "app-1",
      applicationIds: ["app-2", "app-3"],
    });

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.CANDIDATES);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/applications");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/applications/app-1",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/applications/app-2",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/applications/app-3",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("revalidates the list and the home even without application ids", () => {
    invalidateCandidateCache();

    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/applications");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

describe("invalidateCandidateCacheInRouteHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expires the tags with revalidateTag and never uses updateTag", () => {
    invalidateCandidateCacheInRouteHandler({
      candidateId: "cand-1",
      positionId: "pos-1",
      applicationId: "app-1",
    });

    expect(mockedRevalidateTag).toHaveBeenCalledWith(CacheTags.CANDIDATES, {
      expire: 0,
    });
    expect(mockedRevalidateTag).toHaveBeenCalledWith("candidate-cand-1", {
      expire: 0,
    });
    expect(mockedRevalidateTag).toHaveBeenCalledWith("positions-pos-1", {
      expire: 0,
    });
    expect(mockedUpdateTag).not.toHaveBeenCalled();
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/candidates/cand-1",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/positions/pos-1",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/applications");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/applications/app-1",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

describe("invalidateBehavioralRubricCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revalidates the applications and no evaluation dashboard path", () => {
    invalidateBehavioralRubricCache({ candidateId: "cand-1", positionId: "pos-1" });

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.BEHAVIORAL_RUBRICS);
    expect(mockedUpdateTag).toHaveBeenCalledWith(
      "behavioral-rubric-cand-1-pos-1",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/applications");
    const paths = mockedRevalidatePath.mock.calls.map(([path]) => path);
    expect(paths.some((path) => path.includes("evaluation-dashboard"))).toBe(
      false,
    );
  });
});

describe("invalidateAssessmentCache", () => {
  it("revalidates the home", () => {
    vi.clearAllMocks();
    invalidateAssessmentCache();
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

describe("invalidateAssessmentCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update assessments tag", () => {
    invalidateAssessmentCache();

    expect(mockedUpdateTag).toHaveBeenCalledWith(CacheTags.ASSESSMENTS);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/assessments");
  });

  it("should invalidate specific assessment and related quiz", () => {
    invalidateAssessmentCache({ assessmentId: "ass-123", quizId: "quiz-456" });

    expect(mockedUpdateTag).toHaveBeenCalledWith("assessment-ass-123");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/assessments/ass-123"
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

  it("should invalidate assessment evaluation", () => {
    invalidateEvaluationCache({ assessmentId: "ass-123" });

    expect(mockedUpdateTag).toHaveBeenCalledWith(
      "evaluation-assessment-ass-123"
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/assessments/ass-123"
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
    invalidateEvaluationCacheInRouteHandler({ assessmentId: "ass-123" });

    expect(mockedRevalidateTag).toHaveBeenCalledWith(
      "evaluation-assessment-ass-123",
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

describe("scorecard and interview guide tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the collection and entity tags", () => {
    expect(CacheTags.SCORECARDS).toBe("scorecards");
    expect(CacheTags.INTERVIEW_GUIDES).toBe("interview-guides");
    expect(entityTag.scorecard("pos-1")).toBe("scorecard-pos-1");
    expect(entityTag.interviewGuide("g-1")).toBe("interview-guide-g-1");
  });

  it("invalidateScorecardCache expires the tags and revalidates the pages", () => {
    invalidateScorecardCache({ positionId: "pos-1" });

    expect(mockedUpdateTag).toHaveBeenCalledWith("scorecards");
    expect(mockedUpdateTag).toHaveBeenCalledWith("scorecard-pos-1");
    expect(mockedUpdateTag).toHaveBeenCalledTimes(2);
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/positions/pos-1",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/positions/pos-1/scorecard",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("invalidateInterviewGuideCache with a guide id expires its entity tag and page", () => {
    invalidateInterviewGuideCache({ guideId: "g-1", positionId: "pos-1" });

    expect(mockedUpdateTag).toHaveBeenCalledWith("interview-guides");
    expect(mockedUpdateTag).toHaveBeenCalledWith("interview-guide-g-1");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/positions/pos-1",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/positions/pos-1/guides/g-1",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("invalidateInterviewGuideCache without a guide id expires only the collection", () => {
    invalidateInterviewGuideCache({ positionId: "pos-1" });

    expect(mockedUpdateTag).toHaveBeenCalledTimes(1);
    expect(mockedUpdateTag).toHaveBeenCalledWith("interview-guides");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/positions/pos-1",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockedRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("deleting a position also expires scorecards and interview guides", () => {
    invalidatePositionCache("pos-1", { deleted: true });

    expect(mockedUpdateTag).toHaveBeenCalledWith("scorecards");
    expect(mockedUpdateTag).toHaveBeenCalledWith("interview-guides");
  });

  it("updating a position does not expire them", () => {
    invalidatePositionCache("pos-1");

    expect(mockedUpdateTag).not.toHaveBeenCalledWith("scorecards");
    expect(mockedUpdateTag).not.toHaveBeenCalledWith("interview-guides");
  });
});

describe("interview tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the collection and entity tags", () => {
    expect(CacheTags.INTERVIEWS).toBe("interviews");
    expect(entityTag.interview("int-1")).toBe("interview-int-1");
  });

  it("invalidateInterviewCache with an interview id expires its tag and its pages", () => {
    invalidateInterviewCache({ interviewId: "int-1", applicationId: "app-1" });

    expect(mockedUpdateTag).toHaveBeenCalledWith("interviews");
    expect(mockedUpdateTag).toHaveBeenCalledWith("interview-int-1");
    expect(mockedUpdateTag).toHaveBeenCalledTimes(2);
    for (const page of ["prepare", "live", "feedback"]) {
      expect(mockedRevalidatePath).toHaveBeenCalledWith(
        `/dashboard/applications/app-1/interviews/int-1/${page}`,
      );
    }
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/applications/app-1");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/agenda");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockedRevalidatePath).toHaveBeenCalledTimes(6);
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("invalidateInterviewCache without an interview id expires only the collection", () => {
    invalidateInterviewCache({ applicationId: "app-1" });

    expect(mockedUpdateTag).toHaveBeenCalledTimes(1);
    expect(mockedUpdateTag).toHaveBeenCalledWith("interviews");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/applications/app-1");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/agenda");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockedRevalidatePath).toHaveBeenCalledTimes(3);
  });

  it("deleting a position or a candidate expires the interviews", () => {
    invalidatePositionCache("pos-1", { deleted: true });
    expect(mockedUpdateTag).toHaveBeenCalledWith("interviews");

    vi.clearAllMocks();
    invalidateCandidateCache({ candidateId: "cand-1", deleted: true });
    expect(mockedUpdateTag).toHaveBeenCalledWith("interviews");
  });

  it("updating a position or a candidate does not expire the interviews", () => {
    invalidatePositionCache("pos-1");
    invalidateCandidateCache({ candidateId: "cand-1" });
    expect(mockedUpdateTag).not.toHaveBeenCalledWith("interviews");
  });
});
