import prisma from "@/lib/prisma";
import { describe, expect, it } from "vitest";

import {
  getEvaluationById,
  getEvaluationByInterviewId,
  getEvaluationsByCandidateId,
  getEvaluationStats,
  hasEvaluationForPosition,
} from "@/lib/data/evaluations";

describe("evaluations data layer", () => {
  it("getEvaluationByInterviewId returns record or null", async () => {
    (prisma.evaluation.findUnique as any).mockResolvedValueOnce(null);
    const none = await getEvaluationByInterviewId("nope");
    expect(none).toBeNull();

    const fake = { id: "e1", interview: { id: "i1" } };
    (prisma.evaluation.findUnique as any).mockResolvedValueOnce(fake);
    const res = await getEvaluationByInterviewId("i1");
    expect(res).toEqual(fake);
  });

  it("getEvaluationsByCandidateId returns array", async () => {
    const list = [{ id: "e1" }, { id: "e2" }];
    (prisma.evaluation.findMany as any).mockResolvedValueOnce(list);
    const res = await getEvaluationsByCandidateId("c1");
    expect(res).toEqual(list);
  });

  it("getEvaluationById returns record or null", async () => {
    (prisma.evaluation.findUnique as any).mockResolvedValueOnce(null);
    expect(await getEvaluationById("x")).toBeNull();

    const rec = { id: "e2" };
    (prisma.evaluation.findUnique as any).mockResolvedValueOnce(rec);
    expect(await getEvaluationById("e2")).toEqual(rec);
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
      interviewEvaluations: 3,
      candidateEvaluations: 4,
      total: 7,
    });
  });
});
