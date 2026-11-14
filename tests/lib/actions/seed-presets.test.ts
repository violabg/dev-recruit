import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => {
  const preset = { deleteMany: vi.fn(), create: vi.fn() };
  return {
    default: {
      preset,
      $transaction: vi.fn(async (callback: any) => callback({ preset })),
    },
  };
});

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidatePresetCache: vi.fn(),
}));

vi.mock("@/lib/services/logger", () => ({
  logger: { error: vi.fn() },
  aiLogger: { warn: vi.fn(), error: vi.fn() },
}));

import { seedDefaultPresetsAction } from "@/lib/actions/seed-presets";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { unwrap } from "@/lib/utils/action-result";
import { invalidatePresetCache } from "@/lib/utils/cache-utils";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
  vi.mocked(prisma.preset.deleteMany).mockResolvedValue({ count: 3 });
  vi.mocked(prisma.preset.create).mockResolvedValue({ id: "preset" } as any);
});

describe("seedDefaultPresetsAction", () => {
  it("requires a signed-in user and changes nothing otherwise", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await seedDefaultPresetsAction();

    expect(result).toMatchObject({ success: false });
    expect(prisma.preset.deleteMany).not.toHaveBeenCalled();
  });

  it("replaces every preset with the default set", async () => {
    const result = unwrap(await seedDefaultPresetsAction());

    expect(prisma.preset.deleteMany).toHaveBeenCalledWith({});
    expect(result.count).toBeGreaterThan(0);
    expect(prisma.preset.create).toHaveBeenCalledTimes(result.count);
    expect(result.message).toContain(String(result.count));
    expect(invalidatePresetCache).toHaveBeenCalled();
  });

  it("seeds presets for every question type with unique names", async () => {
    await seedDefaultPresetsAction();

    const seeded = vi
      .mocked(prisma.preset.create)
      .mock.calls.map(([args]) => args.data);
    const types = new Set(seeded.map((preset) => preset.questionType));
    const names = seeded.map((preset) => preset.name);

    expect(types).toEqual(
      new Set(["multiple_choice", "open_question", "code_snippet"]),
    );
    expect(new Set(names).size).toBe(names.length);
  });

  it("runs delete and create in one transaction", async () => {
    await seedDefaultPresetsAction();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("reports a failure without exposing the database error", async () => {
    vi.mocked(prisma.preset.create).mockRejectedValueOnce(
      new Error("db exploded"),
    );

    const result = await seedDefaultPresetsAction();

    expect(result).toMatchObject({ success: false });
    expect(JSON.stringify(result)).not.toContain("db exploded");
    expect(invalidatePresetCache).not.toHaveBeenCalled();
  });
});
