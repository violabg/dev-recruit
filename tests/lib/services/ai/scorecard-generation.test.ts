import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/ai/generate", () => ({ generateStructured: vi.fn() }));

import prisma from "@/lib/prisma";
import { aiScorecardGenerationSchema } from "@/lib/schemas";
import { generateStructured } from "@/lib/services/ai/generate";
import { generateScorecardCriteria } from "@/lib/services/ai/scorecard-generation";

const proposed = (name: string) => ({
  name,
  description: "Descrizione",
  category: "technical" as const,
  priority: "must" as const,
  weight: 3,
  expectedLevel: 3,
  anchors: { weak: "", medium: "", strong: "" },
  source: "skill" as const,
});

const params = {
  positionTitle: "Frontend Developer",
  experienceLevel: "senior",
  skills: ["React", "TypeScript"],
  softSkills: ["Comunicazione"],
  description: "Team prodotto",
  existingNames: ["typescript"],
  specificModel: "openai/gpt-oss-20b",
};

describe("generateScorecardCriteria", () => {
  beforeEach(() => {
    vi.mocked(generateStructured).mockResolvedValue({
      criteria: [proposed("React"), proposed(" TypeScript "), proposed("Testing")],
    });
  });

  it("calls generateStructured with the scorecard task, schema and temperature 0.7", async () => {
    await generateScorecardCriteria(params);

    expect(generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "scorecard_generation",
        schema: aiScorecardGenerationSchema,
        temperature: 0.7,
        specificModel: "openai/gpt-oss-20b",
      }),
    );
    const call = vi.mocked(generateStructured).mock.calls[0][0];
    expect(call).not.toHaveProperty("seed");
    expect(call.prompt).toContain("Frontend Developer");
    expect(call.prompt).toContain("React, TypeScript");
  });

  it("removes the criteria whose name already exists (case-insensitive, trimmed)", async () => {
    const result = await generateScorecardCriteria(params);

    expect(result.criteria.map((criterion) => criterion.name)).toEqual([
      "React",
      "Testing",
    ]);
  });

  it("writes nothing to the database", async () => {
    await generateScorecardCriteria(params);

    for (const delegate of Object.values(prisma) as Record<string, unknown>[]) {
      if (!delegate || typeof delegate !== "object") continue;
      for (const method of ["create", "update", "delete", "upsert", "createMany", "updateMany", "deleteMany"]) {
        const fn = delegate[method];
        if (typeof fn === "function" && vi.isMockFunction(fn)) {
          expect(fn).not.toHaveBeenCalled();
        }
      }
    }
  });
});
