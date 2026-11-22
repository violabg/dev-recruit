import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import type { PositionFieldOptions } from "@/components/positions/position-fields";
import {
  ReferenceCategory,
  referenceCategoryLabels,
} from "../constants/reference-categories";
import prisma from "../prisma";
import { CacheTags, entityTag } from "../utils/cache-utils";

export const getReferenceDataByCategory = cache(
  async (category: ReferenceCategory) => {
    "use cache";
    cacheLife("hours");
    cacheTag(CacheTags.REFERENCE_DATA, entityTag.referenceCategory(category));

    return await prisma.referenceData.findMany({
      where: { category, isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        label: true,
        category: true,
        order: true,
        isActive: true,
      },
    });
  }
);

/**
 * Reference data the position form chooses from (skills grouped by category,
 * soft skills, experience levels, contract types): shared by the dashboard
 * form and the MCP position form widget.
 */
export async function getPositionFieldOptions(): Promise<PositionFieldOptions> {
  const [
    programmingLanguages,
    frameworks,
    databases,
    tools,
    aiSkills,
    softSkills,
    experienceLevels,
    contractTypes,
  ] = await Promise.all([
    getReferenceDataByCategory("programmingLanguage"),
    getReferenceDataByCategory("framework"),
    getReferenceDataByCategory("database"),
    getReferenceDataByCategory("tool"),
    getReferenceDataByCategory("ai_skill"),
    getReferenceDataByCategory("soft_skill"),
    getReferenceDataByCategory("experience_level"),
    getReferenceDataByCategory("contract_type"),
  ]);

  const skillsOf = (
    items: { label: string }[],
    category: keyof typeof referenceCategoryLabels,
  ) =>
    items.map((item) => ({
      label: item.label,
      value: item.label,
      category: referenceCategoryLabels[category],
    }));

  return {
    allSkills: [
      ...skillsOf(programmingLanguages, "programmingLanguage"),
      ...skillsOf(frameworks, "framework"),
      ...skillsOf(databases, "database"),
      ...skillsOf(tools, "tool"),
      ...skillsOf(aiSkills, "ai_skill"),
    ],
    allSoftSkills: softSkills.map((item) => ({ label: item.label, value: item.label })),
    experienceLevels: experienceLevels.map((item) => item.label),
    contractTypes: contractTypes.map((item) => item.label),
  };
}
