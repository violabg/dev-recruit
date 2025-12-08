import { createPresetAction, deletePresetAction } from "@/lib/actions/presets";
import prisma from "@/lib/prisma";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("presets actions", () => {
  beforeEach(() => {
    vi.mocked(prisma.preset.findUnique).mockResolvedValue({ id: "p1" } as any);
    vi.mocked(prisma.preset.create).mockResolvedValue({ id: "new" } as any);
    vi.mocked(prisma.preset.delete).mockResolvedValue({ id: "p1" } as any);
  });

  it("createPresetAction creates a preset", async () => {
    const data = {
      name: "Test Preset",
      label: "Test Label",
      description: "Test description",
      icon: "test-icon",
      questionType: "multiple_choice" as const,
      instructions: "Test instructions",
      focusAreas: ["JavaScript"],
      distractorComplexity: "moderate" as const,
      expectedResponseLength: "medium" as const,
      evaluationCriteria: ["Correctness"],
      language: "JavaScript",
      bugType: "logic" as const,
      codeComplexity: "intermediate" as const,
      includeComments: true,
      tags: ["test"],
      difficulty: 3,
      isDefault: false,
    };

    await createPresetAction(data);

    expect(prisma.preset.create).toHaveBeenCalled();
  });

  it("deletePresetAction deletes a preset", async () => {
    await deletePresetAction("p1");

    expect(prisma.preset.delete).toHaveBeenCalled();
  });
});
