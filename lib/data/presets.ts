"use cache";

import { cacheLife, cacheTag } from "next/cache";
import prisma from "../prisma";
import { Preset } from "../prisma/client";

// Re-export Prisma Preset type for consumers
export type { Preset };

/**
 * Fetch all presets with caching
 * Used by getPresetsAction() to retrieve the full preset list
 * Cache is invalidated via updateTag("presets") after mutations
 */
export async function getPresetsData(): Promise<Preset[]> {
  cacheLife("minutes");
  cacheTag("presets");

  return prisma.preset.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Fetch a single preset by ID with granular caching
 * Used by getPresetAction(id) to retrieve a specific preset for detail/edit pages
 * Cache is invalidated granularly via updateTag("presets", presetId) after mutations
 */
export async function getPresetData(presetId: string): Promise<Preset | null> {
  cacheLife("minutes");
  cacheTag("presets", presetId);

  return prisma.preset.findUnique({
    where: { id: presetId },
  });
}
