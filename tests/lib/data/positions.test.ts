import {
  getAllPositions,
  getPositionById,
  getPositionLevelsForSelect,
  getPositions,
  getPositionsCount,
  getPositionsForSelect,
  getRecentPositions,
} from "@/lib/data/positions";
import prisma from "@/lib/prisma";
import { describe, expect, it } from "vitest";

describe("positions data layer", () => {
  it("getPositions returns paginated results", async () => {
    (prisma.position.findMany as any).mockResolvedValueOnce([{ id: "p1" }]);
    (prisma.position.count as any).mockResolvedValueOnce(1);
    const res = await getPositions({ page: 1, pageSize: 10 });
    expect(res.positions[0].id).toBe("p1");
    expect(res.totalCount).toBe(1);
  });

  it("getPositionById returns null or record", async () => {
    (prisma.position.findFirst as any).mockResolvedValueOnce(null);
    expect(await getPositionById("x")).toBeNull();
    const rec = { id: "p2" };
    (prisma.position.findFirst as any).mockResolvedValueOnce(rec);
    expect(await getPositionById("p2")).toEqual(rec);
  });

  it("counts and lists helpers return values", async () => {
    (prisma.position.count as any).mockResolvedValueOnce(5);
    expect(await getPositionsCount()).toBe(5);

    (prisma.position.findMany as any).mockResolvedValueOnce([{ id: "a" }]);
    expect(await getAllPositions()).toEqual([{ id: "a" }]);

    (prisma.position.findMany as any).mockResolvedValueOnce([{ id: "b" }]);
    expect(await getRecentPositions(1)).toEqual([{ id: "b" }]);

    (prisma.position.findMany as any).mockResolvedValueOnce([{ id: "c" }]);
    expect(await getPositionsForSelect()).toEqual([{ id: "c" }]);

    (prisma.position.findMany as any).mockResolvedValueOnce([
      { experienceLevel: "junior" },
      { experienceLevel: "senior" },
    ]);
    const levels = await getPositionLevelsForSelect();
    expect(levels).toContain("junior");
  });
});
