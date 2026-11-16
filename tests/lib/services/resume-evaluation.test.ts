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

import prisma from "@/lib/prisma";
import { advanceApplicationStage } from "@/lib/services/applications";
import { MAX_RESUME_CHARS } from "@/lib/services/ai/evaluation-prompts";
import {
  cleanJsonResponse,
  prepareResumeEvaluation,
  ResumeEvaluationError,
  saveResumeEvaluation,
} from "@/lib/services/resume-evaluation";
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

  it("reports an unreadable PDF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, statusText: "Not Found" })),
    );

    await expect(prepareResumeEvaluation("cand1", "pos1")).rejects.toThrow(
      "Impossibile leggere il curriculum",
    );
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
        createdBy: "user1",
      },
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
