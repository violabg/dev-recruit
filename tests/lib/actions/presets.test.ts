import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    preset: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidatePresetCache: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
}));

vi.mock("@/lib/services/logger", () => ({
  logger: { error: vi.fn() },
  aiLogger: { warn: vi.fn(), error: vi.fn() },
}));

import {
  createPresetAction,
  deletePresetAction,
  updatePresetAction,
} from "@/lib/actions/presets";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { GENERIC_ERROR } from "@/lib/utils/action-result";
import { invalidatePresetCache } from "@/lib/utils/cache-utils";
import { redirect } from "next/navigation";

const preset = {
  name: "react-hooks",
  label: "React Hooks",
  description: "Hook avanzati",
  icon: "Code",
  questionType: "multiple_choice" as const,
  tags: ["React"],
  difficulty: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
  vi.mocked(prisma.preset.findUnique).mockResolvedValue({
    id: "preset-1",
  } as any);
  vi.mocked(prisma.preset.create).mockResolvedValue({ id: "preset-1" } as any);
  vi.mocked(prisma.preset.update).mockResolvedValue({ id: "preset-1" } as any);
});

describe("createPresetAction", () => {
  it("creates the preset and returns its id", async () => {
    const result = await createPresetAction(preset as any);

    expect(result).toEqual({ success: true, presetId: "preset-1" });
    expect(prisma.preset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "react-hooks" }),
    });
    expect(invalidatePresetCache).toHaveBeenCalledWith("preset-1");
  });

  it("rejects invalid input without touching the database", async () => {
    const result = await createPresetAction({ ...preset, name: "" } as any);

    expect(result).toMatchObject({ success: false });
    expect(prisma.preset.create).not.toHaveBeenCalled();
  });

  it("hides database errors behind a generic message", async () => {
    vi.mocked(prisma.preset.create).mockRejectedValueOnce(
      new Error("unique constraint failed on presets.name"),
    );

    const result = await createPresetAction(preset as any);

    expect(result).toEqual({ success: false, error: GENERIC_ERROR });
  });

  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await createPresetAction(preset as any);

    expect(result).toMatchObject({ success: false });
    expect(prisma.preset.create).not.toHaveBeenCalled();
  });
});

describe("updatePresetAction", () => {
  it("updates the preset and returns its id", async () => {
    const result = await updatePresetAction("preset-1", {
      label: "Nuova etichetta",
    } as any);

    expect(result).toEqual({ success: true, presetId: "preset-1" });
    expect(prisma.preset.update).toHaveBeenCalledWith({
      where: { id: "preset-1" },
      data: expect.objectContaining({ label: "Nuova etichetta" }),
    });
    expect(invalidatePresetCache).toHaveBeenCalledWith("preset-1");
  });

  it("reports a missing preset", async () => {
    vi.mocked(prisma.preset.findUnique).mockResolvedValueOnce(null);

    const result = await updatePresetAction("nope", { label: "X" } as any);

    expect(result).toEqual({ success: false, error: "Preset non trovato" });
    expect(prisma.preset.update).not.toHaveBeenCalled();
  });
});

describe("deletePresetAction", () => {
  it("deletes the preset, expires its cache entry and redirects to the list", async () => {
    await deletePresetAction("preset-1");

    expect(prisma.preset.delete).toHaveBeenCalledWith({
      where: { id: "preset-1" },
    });
    expect(invalidatePresetCache).toHaveBeenCalledWith("preset-1");
    expect(redirect).toHaveBeenCalledWith("/dashboard/presets");
  });

  it("reports a missing preset", async () => {
    vi.mocked(prisma.preset.findUnique).mockResolvedValueOnce(null);

    const result = await deletePresetAction("nope");

    expect(result).toEqual({ success: false, error: "Preset non trovato" });
    expect(prisma.preset.delete).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
