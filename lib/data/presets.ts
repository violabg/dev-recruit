"use cache";

import { cacheLife, cacheTag } from "next/cache";
import prisma from "../prisma";
import { presetSchema, type Preset } from "../schemas";

/**
 * Fetch all presets with caching
 * Used by getPresetsAction() to retrieve the full preset list
 * Cache is invalidated via updateTag("presets") after mutations
 */
export async function getPresetsData(): Promise<Preset[]> {
  cacheLife("minutes");
  cacheTag("presets");

  const presets = await prisma.preset.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return presets.map((p) => presetSchema.parse(p));
}

/**
 * Fetch a single preset by ID with granular caching
 * Used by getPresetAction(id) to retrieve a specific preset for detail/edit pages
 * Cache is invalidated granularly via updateTag("presets", presetId) after mutations
 */
export async function getPresetData(presetId: string): Promise<Preset | null> {
  cacheLife("minutes");
  cacheTag("presets", presetId);

  const preset = await prisma.preset.findUnique({
    where: { id: presetId },
  });

  if (!preset) return null;
  return presetSchema.parse(preset);
}
