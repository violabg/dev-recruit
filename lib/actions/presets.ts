"use server";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { z } from "zod/v4";
import { requireUser } from "../auth-server";
import { getPresetData, getPresetsData } from "../data/presets";
import prisma from "../prisma";
import {
  createPresetSchema,
  updatePresetSchema,
  type CreatePresetInput,
  type UpdatePresetInput,
} from "../schemas";

// Get all presets
export async function getPresetsAction() {
  const user = await requireUser();

  try {
    const presets = await getPresetsData();
    return { success: true, presets };
  } catch (error) {
    console.error("Error fetching presets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch presets",
    };
  }
}

// Get a single preset by ID
export async function getPresetAction(presetId: string) {
  const user = await requireUser();
  ("use cache");
  cacheLife("minutes");
  cacheTag("presets", presetId);

  try {
    const preset = await getPresetData(presetId);

    if (!preset) {
      return { success: false, error: "Preset not found" };
    }

    return { success: true, preset };
  } catch (error) {
    console.error("Error fetching preset:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch preset",
    };
  }
}

// Create a new preset
export async function createPresetAction(data: CreatePresetInput) {
  const user = await requireUser();

  try {
    // Validate input
    const validatedData = createPresetSchema.parse(data);

    const preset = await prisma.preset.create({
      data: validatedData as any,
    });

    // Invalidate cache
    updateTag("presets");

    // Return success before redirecting
    return { success: true, presetId: preset.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid input",
        issues: error.issues,
      };
    }

    console.error("Error creating preset:", error);
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
  const user = await requireUser();

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
      data: validatedData as any,
    });

    // Invalidate cache
    updateTag("presets");

    // Return success before redirecting
    return { success: true, presetId: preset.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid input",
        issues: error.issues,
      };
    }

    console.error("Error updating preset:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update preset",
    };
  }
}

// Delete a preset
export async function deletePresetAction(presetId: string) {
  const user = await requireUser();

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

    // Invalidate cache
    updateTag("presets");

    return { success: true };
  } catch (error) {
    console.error("Error deleting preset:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete preset",
    };
  }
}

// Bulk create presets (for seeding)
export async function bulkCreatePresetsAction(presets: CreatePresetInput[]) {
  const user = await requireUser();

  try {
    const created = await Promise.all(
      presets.map((preset) =>
        prisma.preset.create({
          data: preset as any,
        })
      )
    );

    // Invalidate cache
    updateTag("presets");

    return { success: true, created };
  } catch (error) {
    console.error("Error bulk creating presets:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create presets",
    };
  }
}
