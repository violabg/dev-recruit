import {
  getCandidatesByPosition,
  getCandidatesCount,
  getCandidateStats,
  getCandidateWithDetails,
  getFilteredCandidates,
  getRecentCandidateIds,
} from "@/lib/data/candidates";
import prisma from "@/lib/prisma";
import { describe, expect, it, vi } from "vitest";

describe("candidates data layer", () => {
  it("getCandidateStats returns aggregated counts", async () => {
    (prisma.candidate.groupBy as any) = vi.fn().mockResolvedValueOnce([
      { status: "active", _count: { _all: 2 } },
      { status: "inactive", _count: { _all: 1 } },
    ]);
    (prisma.candidate.count as any).mockResolvedValueOnce(3);

    const res = await getCandidateStats();
    expect(res.totalCandidates).toBe(3);
    expect(res.statusCounts).toEqual([
      { status: "active", count: 2 },
      { status: "inactive", count: 1 },
    ]);
  });

  it("getFilteredCandidates returns paginated data and applies filters", async () => {
    const fake = [
      { id: "c1", createdAt: new Date(), interviews: [], positions: [] },
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

    const rec = { id: "c3", interviews: [] };
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
});
