/**
 * The default presets, defined once.
 *
 * Plain data with a type-only Prisma import, so both the server action
 * (lib/actions/seed-presets.ts, via @/) and the seed script
 * (prisma/seed.ts, via a relative path) can use the same list.
 */

import type { Prisma } from "@/lib/prisma/client";

// Type for preset seed data (subset of PresetCreateInput)
export type PresetSeedData = Omit<
  Prisma.PresetCreateInput,
  "id" | "createdAt" | "updatedAt"
>;

export const DEFAULT_PRESETS: PresetSeedData[] = [
  // Frontend Presets
  {
    name: "react-hooks",
    label: "Esperto di React Hooks",
    description: "Hook avanzati di React e gestione dello stato",
    icon: "Code",
    questionType: "multiple_choice",
    focusAreas: [
      "React Hooks",
      "useEffect",
      "Custom Hooks",
      "State Management",
    ],
    distractorComplexity: "complex",
    instructions:
      "Concentrati sui pattern avanzati degli hook di React e sulle best practice",
    tags: ["React", "Hooks", "Advanced"],
    difficulty: 4,
  },
  {
    name: "typescript-mastery",
    label: "Padronanza di TypeScript",
    description: "Sistema di tipi complesso e generics",
    icon: "Shield",
    questionType: "code_snippet",
    language: "typescript",
    bugType: "syntax",
    codeComplexity: "advanced",
    includeComments: true,
    instructions:
      "Verifica la conoscenza avanzata del sistema di tipi di TypeScript",
    tags: ["TypeScript", "Types", "Advanced"],
    difficulty: 4,
  },
  {
    name: "frontend-performance",
    label: "Performance frontend",
    description: "Tecniche di ottimizzazione e best practice",
    icon: "Zap",
    questionType: "open_question",
    expectedResponseLength: "medium",
    evaluationCriteria: [
      "performance optimization",
      "bundle size",
      "loading speed",
    ],
    instructions:
      "Concentrati su problemi reali di performance del frontend",
    tags: ["Performance", "Optimization"],
    difficulty: 3,
  },

  // Backend Presets
  {
    name: "api-design",
    label: "Progettazione di API",
    description: "Architettura di API RESTful e best practice",
    icon: "Layers",
    questionType: "multiple_choice",
    focusAreas: ["REST API", "HTTP Methods", "Status Codes", "API Design"],
    distractorComplexity: "moderate",
    instructions:
      "Verifica la comprensione dei principi di progettazione di API scalabili",
    tags: ["API", "REST", "Backend"],
    difficulty: 3,
  },
  {
    name: "database-optimization",
    label: "Esperto di database",
    description: "Ottimizzazione delle query e progettazione di database",
    icon: "Database",
    questionType: "code_snippet",
    language: "sql",
    bugType: "performance",
    codeComplexity: "intermediate",
    includeComments: false,
    instructions:
      "Concentrati sull'ottimizzazione delle query e sulle strategie di indicizzazione",
    tags: ["Database", "SQL", "Performance"],
    difficulty: 4,
  },
  {
    name: "security-awareness",
    label: "Esperto di sicurezza",
    description: "Vulnerabilità di sicurezza e contromisure",
    icon: "Shield",
    questionType: "code_snippet",
    language: "javascript",
    bugType: "security",
    codeComplexity: "advanced",
    includeComments: false,
    instructions: "Individua e correggi le vulnerabilità di sicurezza",
    tags: ["Security", "Vulnerabilities"],
    difficulty: 4,
  },

  // General Presets
  {
    name: "problem-solving",
    label: "Problem solving",
    description: "Sfide di algoritmi e logica",
    icon: "Brain",
    questionType: "open_question",
    expectedResponseLength: "long",
    evaluationCriteria: ["algorithm efficiency", "code clarity", "edge cases"],
    instructions:
      "Verifica il ragionamento algoritmico e l'approccio alla risoluzione dei problemi",
    tags: ["Algorithms", "Logic"],
    difficulty: 3,
  },
  {
    name: "system-design",
    label: "System Design",
    description: "Architettura e scalabilità",
    icon: "Settings",
    questionType: "open_question",
    expectedResponseLength: "long",
    evaluationCriteria: ["scalability", "architecture", "trade-offs"],
    instructions: "Progetta un'architettura di sistema scalabile",
    tags: ["Architecture", "Scalability"],
    difficulty: 4,
  },
  {
    name: "best-practices",
    label: "Best Practices",
    description: "Qualità e manutenibilità del codice",
    icon: "Target",
    questionType: "multiple_choice",
    focusAreas: ["Code Quality", "SOLID Principles", "Design Patterns"],
    distractorComplexity: "moderate",
    instructions:
      "Verifica la conoscenza delle best practice di ingegneria del software",
    tags: ["Best Practices", "Clean Code"],
    difficulty: 3,
  },
];
