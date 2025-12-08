import { createPosition, deletePosition } from "@/lib/actions/positions";
import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("positions actions", () => {
  beforeEach(() => {
    vi.mocked(prisma.position.findUnique).mockResolvedValue({
      id: "pos1",
    } as any);
    vi.mocked(prisma.position.create).mockResolvedValue({ id: "new" } as any);
    vi.mocked(prisma.position.delete).mockResolvedValue({ id: "pos1" } as any);
  });

  it("createPosition creates a position", async () => {
    const data = {
      title: "Developer",
      description: "A job",
      experienceLevel: "mid" as const,
      skills: ["JS"],
      softSkills: ["teamwork"],
      contractType: "full-time" as const,
    };

    await createPosition(data);

    expect(prisma.position.create).toHaveBeenCalled();
  });

  it("deletePosition deletes a position", async () => {
    await deletePosition("pos1");

    expect(prisma.position.delete).toHaveBeenCalled();
  });
});
