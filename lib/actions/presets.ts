"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "../auth-server";
import {
  getPresetData,
  getPresetsData,
  type PresetsFilterParams,
} from "../data/presets";
import prisma from "../prisma";
import {
  createPresetSchema,
  updatePresetSchema,
  type CreatePresetInput,
  type UpdatePresetInput,
} from "../schemas";
import { invalidatePresetCache } from "../utils/cache-utils";

// Get all presets with pagination and search
export async function getPresetsAction(params?: PresetsFilterParams) {
  try {
    const result = await getPresetsData(params);
    return { success: true, ...result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch presets",
      presets: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }
}

// Get a single preset by ID
export async function getPresetAction(presetId: string) {
  try {
    const preset = await getPresetData(presetId);

    if (!preset) {
      return { success: false, error: "Preset not found" };
    }

    return { success: true, preset };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch preset",
    };
  }
}

// Create a new preset
export async function createPresetAction(data: CreatePresetInput) {
  await requireUser();

  try {
    // Validate input
    const validatedData = createPresetSchema.parse(data);

    const preset = await prisma.preset.create({
      data: validatedData as Parameters<typeof prisma.preset.create>[0]["data"],
    });

    invalidatePresetCache(preset.id);

    return { success: true, presetId: preset.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid input",
        issues: error.issues,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create preset",
    };
  }
}

// Update a preset
export async function updatePresetAction(
  presetId: string,
  data: UpdatePresetInput
) {
  await requireUser();

  try {
    // Verify preset exists
    const existingPreset = await prisma.preset.findUnique({
      where: { id: presetId },
    });

    if (!existingPreset) {
      return {
        success: false,
        error: "Preset not found",
      };
    }

    // Validate input
    const validatedData = updatePresetSchema.parse(data);

    const preset = await prisma.preset.update({
      where: { id: presetId },
      data: validatedData as Parameters<typeof prisma.preset.update>[0]["data"],
    });

    invalidatePresetCache(preset.id);

    return { success: true, presetId: preset.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid input",
        issues: error.issues,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update preset",
    };
  }
}

// Delete a preset
export async function deletePresetAction(presetId: string) {
  await requireUser();

  try {
    const preset = await prisma.preset.findUnique({
      where: { id: presetId },
    });

    if (!preset) {
      return {
        success: false,
        error: "Preset not found",
      };
    }

    await prisma.preset.delete({
      where: { id: presetId },
    });

    invalidatePresetCache();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete preset",
    };
  }

  redirect("/dashboard/presets");
}

// Bulk create presets (for seeding)
export async function bulkCreatePresetsAction(presets: CreatePresetInput[]) {
  await requireUser();

  try {
    const created = await Promise.all(
      presets.map((preset) =>
        prisma.preset.create({
          data: preset as Parameters<typeof prisma.preset.create>[0]["data"],
        })
      )
    );

    invalidatePresetCache();

    return { success: true, created };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create presets",
    };
  }
}
