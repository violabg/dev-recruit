import {
  referenceCategories,
  type ReferenceCategory,
} from "@/lib/constants/reference-categories";
import { z } from "zod";

export const referenceDataFormSchema = z.object({
  category: z.enum(referenceCategories, {
    error: "Categoria non valida",
  }),
  label: z.string().min(1, { error: "L'etichetta è obbligatoria" }),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const updateReferenceDataFormSchema = referenceDataFormSchema
  .partial()
  .extend({
    id: z.string().cuid(),
  });

export const reorderReferenceDataSchema = z.object({
  category: z.enum(referenceCategories),
  itemIds: z.array(z.string().cuid()),
});

export type ReferenceDataFormData = z.infer<typeof referenceDataFormSchema>;
export type UpdateReferenceDataFormData = z.infer<
  typeof updateReferenceDataFormSchema
>;
export type ReferenceCategoryType = ReferenceCategory;
