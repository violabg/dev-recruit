export const referenceCategories = [
  "programmingLanguage",
  "framework",
  "database",
  "tool",
  "soft_skill",
  "contract_type",
  "experience_level",
] as const;

export type ReferenceCategory = (typeof referenceCategories)[number];

export const referenceCategoryLabels: Record<ReferenceCategory, string> = {
  programmingLanguage: "Linguaggi",
  framework: "Framework",
  database: "Database",
  tool: "Strumenti",
  soft_skill: "Soft Skills",
  contract_type: "Tipi Contratto",
  experience_level: "Livelli Esperienza",
};
