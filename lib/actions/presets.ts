"use server";
import { redirect } from "next/navigation";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import {
  createPresetSchema,
  updatePresetSchema,
  type CreatePresetInput,
  type UpdatePresetInput,
} from "../schemas";
import { invalidatePresetCache } from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

export async function createPresetAction(data: CreatePresetInput) {
  return runAction("createPresetAction", async () => {
    await requireUser();
    const validatedData = createPresetSchema.parse(data);

    const preset = await prisma.preset.create({
      data: validatedData as Parameters<typeof prisma.preset.create>[0]["data"],
    });

    invalidatePresetCache(preset.id);

    return { presetId: preset.id };
  });
}

export async function updatePresetAction(
  presetId: string,
  data: UpdatePresetInput,
) {
  return runAction("updatePresetAction", async () => {
    await requireUser();
    const validatedData = updatePresetSchema.parse(data);

    const existingPreset = await prisma.preset.findUnique({
      where: { id: presetId },
      select: { id: true },
    });

    if (!existingPreset) {
      throw new UserError("Preset non trovato");
    }

    const preset = await prisma.preset.update({
      where: { id: presetId },
      data: validatedData as Parameters<typeof prisma.preset.update>[0]["data"],
    });

    invalidatePresetCache(preset.id);

    return { presetId: preset.id };
  });
}

export async function deletePresetAction(presetId: string) {
  return runAction("deletePresetAction", async () => {
    await requireUser();

    const preset = await prisma.preset.findUnique({
      where: { id: presetId },
      select: { id: true },
    });

    if (!preset) {
      throw new UserError("Preset non trovato");
    }

    await prisma.preset.delete({ where: { id: presetId } });

    invalidatePresetCache(presetId);

    redirect("/dashboard/presets");
  });
}
