export const referenceCategories = [
  "programmingLanguage",
  "framework",
  "database",
  "tool",
  "ai_skill",
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
  ai_skill: "Competenze AI",
  soft_skill: "Soft Skills",
  contract_type: "Tipi Contratto",
  experience_level: "Livelli Esperienza",
};
