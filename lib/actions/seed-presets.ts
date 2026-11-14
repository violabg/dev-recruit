"use server";

import { DEFAULT_PRESETS } from "@/lib/constants/preset-defaults";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { invalidatePresetCache } from "../utils/cache-utils";
import { runAction } from "./run-action";

/** Replace every preset with the default set. */
export async function seedDefaultPresetsAction() {
  return runAction("seedDefaultPresetsAction", async () => {
    await requireUser();

    const created = await prisma.$transaction(async (tx) => {
      await tx.preset.deleteMany({});
      return Promise.all(
        DEFAULT_PRESETS.map((preset) => tx.preset.create({ data: preset })),
      );
    });

    invalidatePresetCache();

    return {
      message: `${created.length} preset predefiniti creati`,
      count: created.length,
    };
  });
}
