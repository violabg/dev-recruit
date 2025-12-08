import {
  getPresetData,
  getPresetsData,
  getRecentPresetIds,
} from "@/lib/data/presets";
import prisma from "@/lib/prisma";
import { describe, expect, it } from "vitest";

describe("presets data layer", () => {
  it("getPresetsData returns paginated presets", async () => {
    (prisma.preset.findMany as any).mockResolvedValueOnce([{ id: "pr1" }]);
    (prisma.preset.count as any).mockResolvedValueOnce(1);
    const res = await getPresetsData({ page: 1, pageSize: 10 });
    expect(res.presets[0].id).toBe("pr1");
    expect(res.totalCount).toBe(1);
  });

  it("getPresetData returns preset or null", async () => {
    (prisma.preset.findUnique as any).mockResolvedValueOnce(null);
    expect(await getPresetData("x")).toBeNull();
    const rec = { id: "pr2" };
    (prisma.preset.findUnique as any).mockResolvedValueOnce(rec);
    expect(await getPresetData("pr2")).toEqual(rec);
  });

  it("getRecentPresetIds returns ids", async () => {
    (prisma.preset.findMany as any).mockResolvedValueOnce([
      { id: "p1" },
      { id: "p2" },
    ]);
    expect(await getRecentPresetIds(2)).toEqual(["p1", "p2"]);
  });
});
