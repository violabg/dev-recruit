"use cache";

import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { Prisma } from "@/lib/prisma/client";
import { CacheTags } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";
import prisma from "../prisma";
import { Preset } from "../prisma/client";

// Re-export Prisma Preset type for consumers
export type { Preset };

export type PaginatedPresets = {
  presets: Preset[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PresetsFilterParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

/**
 * Fetch paginated and filtered presets with caching
 * Used by getPresetsAction() to retrieve the preset list
 * Cache is invalidated via updateTag("presets") after mutations
 */
export async function getPresetsData(
  params?: PresetsFilterParams
): Promise<PaginatedPresets> {
  cacheLife("minutes");
  cacheTag(CacheTags.PRESETS);

  const { search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = params ?? {};
  // Avoid Math.max() which calls .valueOf() and fails with temporary client references
  const normalizedPage = typeof page === "number" && page > 0 ? page : 1;
  const normalizedPageSize =
    typeof pageSize === "number" && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const searchTerm = search?.trim();

  const where: Prisma.PresetWhereInput = searchTerm
    ? {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { label: { contains: searchTerm, mode: "insensitive" } },
          { tags: { has: searchTerm } },
        ],
      }
    : {};

  const [presets, totalCount] = await Promise.all([
    prisma.preset.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      skip: (normalizedPage - 1) * normalizedPageSize,
      take: normalizedPageSize,
    }),
    prisma.preset.count({ where }),
  ]);

  const totalPages =
    totalCount > 0 ? Math.ceil(totalCount / normalizedPageSize) : 1;

  return {
    presets,
    totalCount,
    currentPage: normalizedPage,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPrevPage: normalizedPage > 1,
  };
}

/**
 * Fetch a single preset by ID with granular caching
 * Used by getPresetAction(id) to retrieve a specific preset for detail/edit pages
 * Cache is invalidated granularly via updateTag("presets", presetId) after mutations
 */
export async function getPresetData(presetId: string): Promise<Preset | null> {
  cacheLife("minutes");
  cacheTag(CacheTags.PRESETS, presetId);

  return prisma.preset.findUnique({
    where: { id: presetId },
  });
}

/**
 * Returns last N preset IDs for generateStaticParams.
 * Used to pre-render most recent preset detail pages at build time.
 */
export async function getRecentPresetIds(limit = 100): Promise<string[]> {
  cacheLife("minutes");
  cacheTag(CacheTags.PRESETS);

  const presets = await prisma.preset.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: { id: true },
  });

  return presets.map((p) => p.id);
}
