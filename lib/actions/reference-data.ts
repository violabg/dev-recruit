"use server";

import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import {
  referenceDataFormSchema,
  reorderReferenceDataSchema,
  updateReferenceDataFormSchema,
} from "@/lib/schemas/reference-data";
import { invalidateReferenceDataCache } from "@/lib/utils/cache-utils";

export async function createReferenceDataAction(values: unknown) {
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
    throw new Error("Questo elemento esiste già");
  }

  await prisma.referenceData.create({
    data: payload,
  });

  invalidateReferenceDataCache(payload.category);

  return { success: true };
}

export async function updateReferenceDataAction(values: unknown) {
  await requireUser();

  const payload = updateReferenceDataFormSchema.parse(values);
  const { id, ...data } = payload;

  const item = await prisma.referenceData.update({
    where: { id },
    data,
  });

  invalidateReferenceDataCache(item.category);

  return { success: true };
}

export async function deleteReferenceDataAction(id: string) {
  await requireUser();

  const item = await prisma.referenceData.delete({
    where: { id },
  });

  invalidateReferenceDataCache(item.category);

  return { success: true };
}

export async function reorderReferenceDataAction(values: unknown) {
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

  return { success: true };
}
