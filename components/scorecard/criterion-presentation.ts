import type {
  CriterionCategory,
  CriterionPriority,
  CriterionSource,
} from "@/lib/schemas";

/**
 * Italian labels and tints of the criterion category, priority and source,
 * in one place. Only project colour tokens.
 */

export const CRITERION_CATEGORY_LABEL: Record<CriterionCategory, string> = {
  technical: "Tecnico",
  soft: "Soft skill",
  culture: "Cultura",
};

export const CRITERION_PRIORITY_PRESENTATION: Record<
  CriterionPriority,
  { label: string; className: string }
> = {
  must: { label: "Indispensabile", className: "bg-primary/10 text-primary" },
  nice: {
    label: "Preferibile",
    className: "bg-muted text-muted-foreground",
  },
};

export const CRITERION_SOURCE_LABEL: Record<CriterionSource, string> = {
  skill: "Competenza",
  softSkill: "Soft skill",
  custom: "Personalizzato",
};

export const CRITERION_CATEGORY_OPTIONS: {
  value: CriterionCategory;
  label: string;
}[] = [
  { value: "technical", label: CRITERION_CATEGORY_LABEL.technical },
  { value: "soft", label: CRITERION_CATEGORY_LABEL.soft },
  { value: "culture", label: CRITERION_CATEGORY_LABEL.culture },
];

export const CRITERION_PRIORITY_OPTIONS: {
  value: CriterionPriority;
  label: string;
}[] = [
  { value: "must", label: CRITERION_PRIORITY_PRESENTATION.must.label },
  { value: "nice", label: CRITERION_PRIORITY_PRESENTATION.nice.label },
];

export const CRITERION_SOURCE_OPTIONS: {
  value: CriterionSource;
  label: string;
}[] = [
  { value: "skill", label: CRITERION_SOURCE_LABEL.skill },
  { value: "softSkill", label: CRITERION_SOURCE_LABEL.softSkill },
  { value: "custom", label: CRITERION_SOURCE_LABEL.custom },
];
