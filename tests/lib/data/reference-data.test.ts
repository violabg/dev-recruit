import { getPositionFieldOptions } from "@/lib/data/reference-data";
import { positionFormWidget } from "@/lib/mcp/widgets/position-form";
import prisma from "@/lib/prisma";
import { describe, expect, it } from "vitest";

const rows: Record<string, string[]> = {
  programmingLanguage: ["TypeScript"],
  framework: ["React", "PyTorch"],
  database: ["PostgreSQL", "pgvector"],
  tool: ["Docker", "OpenAI"],
  ai_skill: ["RAG", "Prompt engineering"],
  soft_skill: ["Comunicazione"],
  experience_level: ["Senior"],
  contract_type: ["Tempo indeterminato"],
};

describe("position reference data", () => {
  it("offers the AI skills to the dashboard and the MCP position form", async () => {
    (prisma.referenceData.findMany as any).mockImplementation(
      async ({ where }: { where: { category: string } }) =>
        (rows[where.category] ?? []).map((label, order) => ({
          id: `${where.category}-${order}`,
          label,
          category: where.category,
          order,
          isActive: true,
        })),
    );

    const options = await getPositionFieldOptions();

    expect(options.allSkills).toContainEqual({
      label: "PyTorch",
      value: "PyTorch",
      category: "Framework",
    });
    expect(options.allSkills).toContainEqual({
      label: "RAG",
      value: "RAG",
      category: "Competenze AI",
    });

    const widget = positionFormWidget(options, {});

    expect(widget.options.allSkills).toContainEqual({
      label: "Prompt engineering",
      value: "Prompt engineering",
      category: "Competenze AI",
    });
  });
});
