import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { ReferenceCategory } from "../constants/reference-categories";
import prisma from "../prisma";
import { CacheTags, entityTag } from "../utils/cache-utils";

export const getAllReferenceData = cache(async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.REFERENCE_DATA);

  return await prisma.referenceData.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });
});

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

export const getAllReferenceDataGrouped = cache(async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.REFERENCE_DATA);

  const data = await prisma.referenceData.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });

  return data.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [] as typeof data;
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof data>);
});
