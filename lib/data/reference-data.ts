import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { ReferenceCategory } from "../constants/reference-categories";
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
