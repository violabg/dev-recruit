import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("unpdf", () => ({
  extractText: vi.fn(),
  getDocumentProxy: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@/lib/services/logger", () => ({
  aiLogger: { warn: vi.fn(), error: vi.fn() },
}));

// Stage rules have their own tests: here the stage never changes
vi.mock("@/lib/services/applications", () => ({
  advanceApplicationStage: vi.fn(async (_client, applicationId: string) => ({
    applicationId,
    candidateId: "cand1",
    positionId: "pos1",
    previousStage: "screening",
    stage: "screening",
    changed: false,
    cancelledAssessmentIds: [],
  })),
}));

// Active criteria of the position scorecard (the scorecard reads have their
// own tests)
vi.mock("@/lib/services/scorecards", () => ({
  getActiveCriteria: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { advanceApplicationStage } from "@/lib/services/applications";
import { MAX_RESUME_CHARS } from "@/lib/services/ai/evaluation-prompts";
import {
  buildCriteriaAssessment,
  cleanJsonResponse,
  prepareResumeEvaluation,
  ResumeEvaluationError,
  saveResumeEvaluation,
} from "@/lib/services/resume-evaluation";
import { getActiveCriteria } from "@/lib/services/scorecards";
import { extractText } from "unpdf";

const RESUME =
  "Senior Software Developer con 10 anni di esperienza in JavaScript, React e Node.js.";

const candidate = {
  id: "cand1",
  firstName: "Mario",
  lastName: "Rossi",
  resumeUrl: "https://files.example/cv.pdf",
};
const position = {
  id: "pos1",
  title: "Frontend Developer",
  description: "Sviluppo UI",
  experienceLevel: "senior",
  skills: ["React"],
  softSkills: ["Comunicazione"],
};

describe("prepareResumeEvaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue(candidate as any);
    vi.mocked(prisma.position.findUnique).mockResolvedValue(position as any);
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: "app1",
    } as any);
    vi.mocked(prisma.evaluation.findFirst).mockResolvedValue(null);
    vi.mocked(extractText).mockResolvedValue({ text: RESUME } as any);
    vi.mocked(getActiveCriteria).mockResolvedValue([]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );
  });

  it("builds the prompt from the resume and the position", async () => {
    const prepared = await prepareResumeEvaluation("cand1", "pos1");

    expect(prepared).toMatchObject({
      candidateId: "cand1",
      positionId: "pos1",
      title: "Frontend Developer",
    });
    expect(prepared.prompt).toContain("Mario Rossi");
    expect(prepared.prompt).toContain(RESUME);
    expect(prepared.prompt).toContain("Frontend Developer");
  });

  it("returns the application id of candidate + position", async () => {
    const prepared = await prepareResumeEvaluation("cand1", "pos1");

    expect(prepared.applicationId).toBe("app1");
    expect(prisma.application.findUnique).toHaveBeenCalledWith({
      where: {
        candidateId_positionId: { candidateId: "cand1", positionId: "pos1" },
      },
      select: { id: true },
    });
  });

  it("refuses a position the candidate did not apply to", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(null);

    const error = await prepareResumeEvaluation("cand1", "pos1").catch(
      (e) => e,
    );

    expect(error).toBeInstanceOf(ResumeEvaluationError);
    expect(error.status).toBe(404);
    expect(error.message).toBe(
      "Il candidato non è candidato a questa posizione",
    );
  });

  it("looks for an existing resume evaluation only (assessmentId null)", async () => {
    await prepareResumeEvaluation("cand1", "pos1");

    expect(prisma.evaluation.findFirst).toHaveBeenCalledWith({
      where: { candidateId: "cand1", positionId: "pos1", assessmentId: null },
      select: { id: true },
    });
  });

  it("cuts very long resumes at the single shared limit", async () => {
    vi.mocked(extractText).mockResolvedValue({
      text: "x".repeat(MAX_RESUME_CHARS + 500),
    } as any);

    const prepared = await prepareResumeEvaluation("cand1", "pos1");

    expect(prepared.prompt).toContain("... [troncato]");
    expect(prepared.prompt).not.toContain("x".repeat(MAX_RESUME_CHARS + 1));
  });

  it.each([
    ["candidate missing", () => vi.mocked(prisma.candidate.findUnique).mockResolvedValueOnce(null), 404],
    [
      "no resume",
      () =>
        vi
          .mocked(prisma.candidate.findUnique)
          .mockResolvedValueOnce({ ...candidate, resumeUrl: null } as any),
      400,
    ],
    ["position missing", () => vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null), 404],
    [
      "evaluation exists",
      () =>
        vi
          .mocked(prisma.evaluation.findFirst)
          .mockResolvedValueOnce({ id: "e1" } as any),
      409,
    ],
    [
      "resume too short",
      () => vi.mocked(extractText).mockResolvedValueOnce({ text: "poco" } as any),
      400,
    ],
  ])("fails with a status when %s", async (_name, arrange, status) => {
    arrange();

    const error = await prepareResumeEvaluation("cand1", "pos1").catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(ResumeEvaluationError);
    expect(error.status).toBe(status);
  });

  it("resolves a bare R2 key before reading the resume", async () => {
    vi.stubEnv("R2_PUBLIC_URL", "https://files.example");
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      ...candidate,
      resumeUrl: "resumes/cand1/cv.pdf",
    } as any);

    await prepareResumeEvaluation("cand1", "pos1");

    expect(fetch).toHaveBeenCalledWith(
      "https://files.example/resumes/cand1/cv.pdf",
    );
    vi.unstubAllEnvs();
  });

  it("without criteria asks nothing more and returns an empty key map", async () => {
    const prepared = await prepareResumeEvaluation("cand1", "pos1");

    expect(getActiveCriteria).toHaveBeenCalledWith("pos1");
    expect(prepared.criterionKeys).toEqual([]);
    expect(prepared.prompt).not.toContain("criteriaAssessment");
  });

  it("lists the active criteria by key and returns the key map", async () => {
    vi.mocked(getActiveCriteria).mockResolvedValue([
      {
        id: "crit-react",
        name: "React",
        description: "Componenti",
        category: "technical",
        priority: "must",
        weight: 3,
        expectedLevel: 4,
      },
      {
        id: "crit-comm",
        name: "Comunicazione",
        description: null,
        category: "soft",
        priority: "nice",
        weight: 2,
        expectedLevel: 3,
      },
    ]);

    const prepared = await prepareResumeEvaluation("cand1", "pos1");

    expect(prepared.criterionKeys).toEqual([
      { id: "crit-react", key: "C1" },
      { id: "crit-comm", key: "C2" },
    ]);
    expect(prepared.prompt).toContain("C1 - React (livello atteso 4/5): Componenti");
    expect(prepared.prompt).toContain("C2 - Comunicazione (livello atteso 3/5)");
    expect(prepared.prompt).toContain("criteriaAssessment");
  });

  it("removes a marked birth date from the CV before the prompt", async () => {
    vi.mocked(extractText).mockResolvedValue({
      text: `${RESUME}\nData di nascita: 12/03/1990`,
    } as any);

    const prepared = await prepareResumeEvaluation("cand1", "pos1");

    expect(prepared.prompt).toContain("Data di nascita: [rimosso]");
    expect(prepared.prompt).not.toContain("12/03/1990");
  });

  it("reports an unreadable PDF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, statusText: "Not Found" })),
    );

    const error = await prepareResumeEvaluation("cand1", "pos1").catch(
      (e) => e,
    );

    expect(error).toBeInstanceOf(ResumeEvaluationError);
    expect(error.status).toBe(400);
    expect(error.message).toContain("non è raggiungibile");
  });
});

describe("saveResumeEvaluation", () => {
  const response = {
    evaluation: "Profilo solido",
    strengths: ["React"],
    weaknesses: ["Testing"],
    recommendation: "Colloquio tecnico",
    fitScore: 76,
  };
  const params = {
    candidateId: "cand1",
    positionId: "pos1",
    applicationId: "app1",
    title: "Frontend Developer",
    userId: "user1",
    criterionKeys: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.evaluation.create).mockResolvedValue({ id: "e1" } as any);
  });

  it("stores the parsed evaluation with fitScore on a 0-10 scale", async () => {
    await saveResumeEvaluation({
      ...params,
      responseText: "```json\n" + JSON.stringify(response) + "\n```",
    });

    expect(prisma.evaluation.create).toHaveBeenCalledWith({
      data: {
        title: "Frontend Developer",
        candidateId: "cand1",
        positionId: "pos1",
        evaluation: "Profilo solido",
        strengths: ["React"],
        weaknesses: ["Testing"],
        recommendation: "Colloquio tecnico",
        fitScore: 8,
        criteriaAssessment: Prisma.JsonNull,
        createdBy: "user1",
      },
      select: { id: true },
    });
  });

  it("stores the assessment per criterion keyed by id, inside the transaction", async () => {
    await saveResumeEvaluation({
      ...params,
      criterionKeys: [
        { id: "crit-react", key: "C1" },
        { id: "crit-ts", key: "C2" },
        { id: "crit-comm", key: "C3" },
        { id: "crit-lead", key: "C4" },
      ],
      responseText: JSON.stringify({
        ...response,
        criteriaAssessment: [
          { criterionKey: "c1", score: 7, evidence: "  Molti progetti React  " },
          { criterionKey: "C2", score: 0, evidence: "Poco TypeScript" },
          { criterionKey: "C3", score: null, evidence: "" },
          { criterionKey: "C9", score: 4, evidence: "sconosciuto" },
          { criterionKey: "C1", score: 2, evidence: "duplicato" },
        ],
      }),
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(advanceApplicationStage).toHaveBeenCalledWith(
      prisma,
      "app1",
      "cv_evaluated",
    );
    const { data } = vi.mocked(prisma.evaluation.create).mock.calls[0][0] as {
      data: { criteriaAssessment: unknown; fitScore: number };
    };
    expect(data.fitScore).toBe(8);
    expect(data.criteriaAssessment).toEqual({
      // 7 clamped to 5, evidence trimmed; the duplicate C1 is ignored
      "crit-react": { score: 5, evidence: "Molti progetti React" },
      // 0 clamped to 1
      "crit-ts": { score: 1, evidence: "Poco TypeScript" },
      // null stays null
      "crit-comm": { score: null, evidence: "" },
      // not returned by the model: no evidence
      "crit-lead": { score: null, evidence: "" },
    });
  });

  it("stores JsonNull when the model returned no valid criterion", async () => {
    await saveResumeEvaluation({
      ...params,
      criterionKeys: [{ id: "crit-react", key: "C1" }],
      responseText: JSON.stringify({
        ...response,
        criteriaAssessment: [{ criterionKey: "C7", score: 3, evidence: "x" }],
      }),
    });

    expect(prisma.evaluation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ criteriaAssessment: Prisma.JsonNull }),
      select: { id: true },
    });
  });

  it("stores JsonNull without criteria even when the model returns some", async () => {
    await saveResumeEvaluation({
      ...params,
      responseText: JSON.stringify({
        ...response,
        criteriaAssessment: [{ criterionKey: "C1", score: 3, evidence: "x" }],
      }),
    });

    expect(prisma.evaluation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ criteriaAssessment: Prisma.JsonNull }),
      select: { id: true },
    });
  });

  it("stores and advances to screening in one transaction", async () => {
    const result = await saveResumeEvaluation({
      ...params,
      responseText: JSON.stringify(response),
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(advanceApplicationStage).toHaveBeenCalledWith(
      prisma,
      "app1",
      "cv_evaluated",
    );
    expect(result).toEqual({
      id: "e1",
      stageChange: expect.objectContaining({
        applicationId: "app1",
        changed: false,
      }),
    });
  });

  it("stores nothing when the response is not a valid evaluation", async () => {
    await expect(
      saveResumeEvaluation({ ...params, responseText: "non è json" }),
    ).rejects.toThrow();
    await expect(
      saveResumeEvaluation({
        ...params,
        responseText: JSON.stringify({ evaluation: "solo testo" }),
      }),
    ).rejects.toThrow();
    expect(prisma.evaluation.create).not.toHaveBeenCalled();
  });
});

describe("cleanJsonResponse", () => {
  it("strips markdown fences", () => {
    expect(cleanJsonResponse('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(cleanJsonResponse('```\n{"a":1}\n```')).toBe('{"a":1}');
    expect(cleanJsonResponse(' {"a":1} ')).toBe('{"a":1}');
  });
});

describe("buildCriteriaAssessment", () => {
  const keys = [
    { id: "a", key: "C1" },
    { id: "b", key: "C2" },
  ];

  it("returns null without keys or without items", () => {
    expect(
      buildCriteriaAssessment([{ criterionKey: "C1", score: 3, evidence: "" }], []),
    ).toBeNull();
    expect(buildCriteriaAssessment(undefined, keys)).toBeNull();
    expect(buildCriteriaAssessment([], keys)).toBeNull();
  });

  it("rounds a decimal score", () => {
    expect(
      buildCriteriaAssessment(
        [{ criterionKey: "C1", score: 3.6, evidence: "x" }],
        keys,
      ),
    ).toEqual({
      a: { score: 4, evidence: "x" },
      b: { score: null, evidence: "" },
    });
  });
});
