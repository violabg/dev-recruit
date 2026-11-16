import prisma from "@/lib/prisma";
import { describe, expect, it } from "vitest";

import {
  getEvaluationById,
  getEvaluationByAssessmentId,
  getEvaluationsByCandidateId,
  getEvaluationStats,
  hasEvaluationForPosition,
} from "@/lib/data/evaluations";

describe("evaluations data layer", () => {
  it("getEvaluationByAssessmentId returns record or null", async () => {
    (prisma.evaluation.findUnique as any).mockResolvedValueOnce(null);
    const none = await getEvaluationByAssessmentId("nope");
    expect(none).toBeNull();

    // Rows saved before the per-answer detail existed have null JSON columns
    const fake = {
      id: "e1",
      assessment: { id: "a1" },
      answerEvaluations: null,
      criteriaAssessment: null,
    };
    (prisma.evaluation.findUnique as any).mockResolvedValueOnce(fake);
    const res = await getEvaluationByAssessmentId("a1");
    expect(res).toEqual(fake);
  });

  it("getEvaluationsByCandidateId returns array", async () => {
    const list = [
      { id: "e1", answerEvaluations: null, criteriaAssessment: null },
      { id: "e2", answerEvaluations: null, criteriaAssessment: null },
    ];
    (prisma.evaluation.findMany as any).mockResolvedValueOnce(list);
    const res = await getEvaluationsByCandidateId("c1");
    expect(res).toEqual(list);
  });

  it("getEvaluationById returns record or null", async () => {
    (prisma.evaluation.findUnique as any).mockResolvedValueOnce(null);
    expect(await getEvaluationById("x")).toBeNull();

    const rec = { id: "e2", answerEvaluations: null, criteriaAssessment: null };
    (prisma.evaluation.findUnique as any).mockResolvedValueOnce(rec);
    expect(await getEvaluationById("e2")).toEqual(rec);
  });

  it("returns the stored per-answer detail and CV assessment typed", async () => {
    const answerEvaluations = {
      q1: { score: 8, strengths: ["Chiara"], weaknesses: [] },
      q2: { score: 0, strengths: [], weaknesses: ["Assente"] },
    };
    const criteriaAssessment = {
      c1: { score: 4, evidence: "React" },
      c2: { score: null, evidence: "" },
    };
    (prisma.evaluation.findUnique as any).mockResolvedValueOnce({
      id: "e1",
      answerEvaluations,
      criteriaAssessment,
    });

    const res = await getEvaluationByAssessmentId("a1");

    expect(res?.answerEvaluations).toEqual(answerEvaluations);
    expect(res?.criteriaAssessment).toEqual(criteriaAssessment);
  });

  it("reads JSON that does not match the schema as null", async () => {
    (prisma.evaluation.findUnique as any).mockResolvedValueOnce({
      id: "e1",
      answerEvaluations: { q1: { score: 15, strengths: [], weaknesses: [] } },
      criteriaAssessment: { c1: { score: 0, evidence: "" } },
    });

    const res = await getEvaluationById("e1");

    expect(res?.answerEvaluations).toBeNull();
    expect(res?.criteriaAssessment).toBeNull();
  });

  it("hasEvaluationForPosition returns boolean based on count", async () => {
    (prisma.evaluation.count as any).mockResolvedValueOnce(0);
    expect(await hasEvaluationForPosition("c1", "p1")).toBe(false);

    (prisma.evaluation.count as any).mockResolvedValueOnce(2);
    expect(await hasEvaluationForPosition("c1", "p1")).toBe(true);
  });

  it("getEvaluationStats aggregates counts", async () => {
    (prisma.evaluation.count as any).mockResolvedValueOnce(3);
    (prisma.evaluation.count as any).mockResolvedValueOnce(4);
    const stats = await getEvaluationStats();
    expect(stats).toEqual({
      assessmentEvaluations: 3,
      candidateEvaluations: 4,
      total: 7,
    });
  });
});
