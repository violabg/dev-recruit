"use server";

import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import {
  referenceDataFormSchema,
  reorderReferenceDataSchema,
  updateReferenceDataFormSchema,
} from "@/lib/schemas/reference-data";
import { invalidateReferenceDataCache } from "@/lib/utils/cache-utils";
import { runAction, UserError } from "./run-action";

export async function createReferenceDataAction(values: unknown) {
  return runAction("createReferenceDataAction", async () => {
    await requireUser();

    const payload = referenceDataFormSchema.parse(values);

    const existing = await prisma.referenceData.findUnique({
      where: {
        category_label: {
          category: payload.category,
          label: payload.label,
        },
      },
    });

    if (existing) {
      throw new UserError("Questo elemento esiste già");
    }

    await prisma.referenceData.create({
      data: payload,
    });

    invalidateReferenceDataCache(payload.category);

  });
}

export async function updateReferenceDataAction(values: unknown) {
  return runAction("updateReferenceDataAction", async () => {
    await requireUser();

    const payload = updateReferenceDataFormSchema.parse(values);
    const { id, ...data } = payload;

    const item = await prisma.referenceData.update({
      where: { id },
      data,
    });

    invalidateReferenceDataCache(item.category);

  });
}

export async function deleteReferenceDataAction(id: string) {
  return runAction("deleteReferenceDataAction", async () => {
    await requireUser();

    const item = await prisma.referenceData.delete({
      where: { id },
    });

    invalidateReferenceDataCache(item.category);

  });
}

export async function reorderReferenceDataAction(values: unknown) {
  return runAction("reorderReferenceDataAction", async () => {
    await requireUser();

    const { category, itemIds } = reorderReferenceDataSchema.parse(values);

    await prisma.$transaction(
      itemIds.map((id, index) =>
        prisma.referenceData.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    invalidateReferenceDataCache(category);

  });
}
