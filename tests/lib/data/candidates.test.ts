import {
  getCandidatesByPosition,
  getCandidatesCount,
  getCandidateWithDetails,
  getFilteredCandidates,
  getRecentCandidateIds,
} from "@/lib/data/candidates";
import prisma from "@/lib/prisma";
import { cacheTag } from "next/cache";
import { describe, expect, it } from "vitest";

describe("candidates data layer", () => {
  it("getFilteredCandidates returns paginated data and applies filters", async () => {
    const fake = [
      { id: "c1", createdAt: new Date(), assessments: [], applications: [] },
    ];
    (prisma.candidate.findMany as any).mockResolvedValueOnce(fake);
    (prisma.candidate.count as any).mockResolvedValueOnce(1);

    const result = await getFilteredCandidates({ page: 1, pageSize: 10 });
    expect(result.candidates).toEqual(fake);
    expect(result.totalCount).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it("getCandidatesByPosition delegates to prisma and returns list", async () => {
    const list = [{ id: "c2" }];
    (prisma.candidate.findMany as any).mockResolvedValueOnce(list);
    const res = await getCandidatesByPosition("p1");
    expect(res).toBe(list);
  });

  it("getCandidateWithDetails returns record or null", async () => {
    (prisma.candidate.findFirst as any).mockResolvedValueOnce(null);
    expect(await getCandidateWithDetails("x")).toBeNull();

    const rec = { id: "c3", assessments: [] };
    (prisma.candidate.findFirst as any).mockResolvedValueOnce(rec);
    expect(await getCandidateWithDetails("c3")).toEqual(rec);
  });

  it("getCandidatesCount and getRecentCandidateIds return values", async () => {
    (prisma.candidate.count as any).mockResolvedValueOnce(7);
    expect(await getCandidatesCount()).toBe(7);

    (prisma.candidate.findMany as any).mockResolvedValueOnce([
      { id: "r1" },
      { id: "r2" },
    ]);
    expect(await getRecentCandidateIds(2)).toEqual(["r1", "r2"]);
  });

  it("filters by stage on the applications", async () => {
    (prisma.candidate.findMany as any).mockResolvedValueOnce([]);
    (prisma.candidate.count as any).mockResolvedValueOnce(0);

    await getFilteredCandidates({ stage: "interview" });

    expect(prisma.candidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { applications: { some: { stage: "interview" } } },
      }),
    );
  });

  it("applies stage and position to the same application", async () => {
    (prisma.candidate.findMany as any).mockResolvedValueOnce([]);
    (prisma.candidate.count as any).mockResolvedValueOnce(0);

    await getFilteredCandidates({ stage: "assessment", positionId: "p1" });

    const where = {
      applications: { some: { stage: "assessment", positionId: "p1" } },
    };
    expect(prisma.candidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where }),
    );
    expect(prisma.candidate.count).toHaveBeenCalledWith({ where });
  });

  it("ignores an unknown stage", async () => {
    (prisma.candidate.findMany as any).mockResolvedValueOnce([]);
    (prisma.candidate.count as any).mockResolvedValueOnce(0);

    await getFilteredCandidates({ stage: "pending" });

    expect(prisma.candidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it("orders the applications by recent activity and tags the joins", async () => {
    (prisma.candidate.findMany as any).mockResolvedValueOnce([]);
    (prisma.candidate.count as any).mockResolvedValueOnce(0);

    await getFilteredCandidates();

    const { include } = (prisma.candidate.findMany as any).mock.calls[0][0];
    expect(include.applications.orderBy).toEqual({ stageChangedAt: "desc" });
    expect(JSON.stringify(include)).not.toContain("isPrimary");
    expect(cacheTag).toHaveBeenCalledWith("candidates", "positions", "assessments");
  });

  it("getCandidatesByPosition filters through the applications", async () => {
    (prisma.candidate.findMany as any).mockResolvedValueOnce([]);

    await getCandidatesByPosition("p1");

    expect(prisma.candidate.findMany).toHaveBeenCalledWith({
      where: { applications: { some: { positionId: "p1" } } },
      orderBy: { createdAt: "desc" },
    });
  });
});
