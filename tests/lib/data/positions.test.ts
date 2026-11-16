import {
  getAllPositions,
  getOpenPositionsForSelect,
  getPositionById,
  getPositionLevelsForSelect,
  getPositions,
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

  it("lists helpers return values", async () => {
    (prisma.position.findMany as any).mockResolvedValueOnce([{ id: "a" }]);
    expect(await getAllPositions()).toEqual([{ id: "a" }]);

    (prisma.position.findMany as any).mockResolvedValueOnce([{ id: "c" }]);
    expect(await getOpenPositionsForSelect()).toEqual([{ id: "c" }]);

    (prisma.position.findMany as any).mockResolvedValueOnce([
      { experienceLevel: "junior" },
      { experienceLevel: "senior" },
    ]);
    const levels = await getPositionLevelsForSelect();
    expect(levels).toContain("junior");
  });

  it("getPositions filters by status", async () => {
    (prisma.position.findMany as any).mockResolvedValueOnce([]);
    (prisma.position.count as any).mockResolvedValueOnce(0);

    await getPositions({ status: "open" });

    expect(prisma.position.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "open" } }),
    );
    expect(prisma.position.count).toHaveBeenCalledWith({
      where: { status: "open" },
    });
  });

  it("getPositions has no status filter for all", async () => {
    (prisma.position.findMany as any).mockResolvedValueOnce([]);
    (prisma.position.count as any).mockResolvedValueOnce(0);

    await getPositions({ status: "all", search: "dev" });

    expect(prisma.position.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { title: { contains: "dev", mode: "insensitive" } },
      }),
    );
  });

  it("getOpenPositionsForSelect returns the open positions by title", async () => {
    (prisma.position.findMany as any).mockResolvedValueOnce([]);

    await getOpenPositionsForSelect();

    expect(prisma.position.findMany).toHaveBeenCalledWith({
      where: { status: "open" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  });
});
