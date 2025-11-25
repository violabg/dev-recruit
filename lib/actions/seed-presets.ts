"use server";

import { updateTag } from "next/cache";
import prisma from "../prisma";
import { Prisma } from "../prisma/client";

// Type for preset seed data (subset of PresetCreateInput)
type PresetSeedData = Omit<
  Prisma.PresetCreateInput,
  "id" | "createdAt" | "updatedAt"
>;

// Preset data to seed
export const DEFAULT_PRESETS: PresetSeedData[] = [
  // Frontend Presets
  {
    name: "react-hooks",
    label: "React Hooks Expert",
    description: "Advanced React hooks and state management",
    icon: "Code",
    questionType: "multiple_choice" as const,
    focusAreas: [
      "React Hooks",
      "useEffect",
      "Custom Hooks",
      "State Management",
    ],
    distractorComplexity: "complex",
    instructions: "Focus on advanced React hooks patterns and best practices",
    tags: ["React", "Hooks", "Advanced"],
    difficulty: 4,
  },
  {
    name: "typescript-mastery",
    label: "TypeScript Mastery",
    description: "Complex type system and generics",
    icon: "Shield",
    questionType: "code_snippet" as const,
    language: "typescript",
    bugType: "syntax",
    codeComplexity: "advanced",
    includeComments: true,
    instructions: "Test advanced TypeScript type system knowledge",
    tags: ["TypeScript", "Types", "Advanced"],
    difficulty: 4,
  },
  {
    name: "frontend-performance",
    label: "Frontend Performance",
    description: "Optimization techniques and best practices",
    icon: "Zap",
    questionType: "open_question" as const,
    requireCodeExample: true,
    expectedResponseLength: "medium",
    evaluationCriteria: [
      "performance optimization",
      "bundle size",
      "loading speed",
    ],
    instructions: "Focus on real-world frontend performance challenges",
    tags: ["Performance", "Optimization"],
    difficulty: 3,
  },

  // Backend Presets
  {
    name: "api-design",
    label: "API Design",
    description: "RESTful API architecture and best practices",
    icon: "Layers",
    questionType: "multiple_choice" as const,
    focusAreas: ["REST API", "HTTP Methods", "Status Codes", "API Design"],
    distractorComplexity: "moderate",
    instructions: "Test understanding of scalable API design principles",
    tags: ["API", "REST", "Backend"],
    difficulty: 3,
  },
  {
    name: "database-optimization",
    label: "Database Expert",
    description: "Query optimization and database design",
    icon: "Database",
    questionType: "code_snippet" as const,
    language: "sql",
    bugType: "performance",
    codeComplexity: "intermediate",
    includeComments: false,
    instructions: "Focus on query optimization and indexing strategies",
    tags: ["Database", "SQL", "Performance"],
    difficulty: 4,
  },
  {
    name: "security-awareness",
    label: "Security Expert",
    description: "Security vulnerabilities and mitigation",
    icon: "Shield",
    questionType: "code_snippet" as const,
    language: "javascript",
    bugType: "security",
    codeComplexity: "advanced",
    includeComments: false,
    instructions: "Identify and fix security vulnerabilities",
    tags: ["Security", "Vulnerabilities"],
    difficulty: 4,
  },

  // General Presets
  {
    name: "problem-solving",
    label: "Problem Solver",
    description: "Algorithm and logic challenges",
    icon: "Brain",
    questionType: "open_question" as const,
    requireCodeExample: true,
    expectedResponseLength: "long",
    evaluationCriteria: ["algorithm efficiency", "code clarity", "edge cases"],
    instructions: "Test algorithmic thinking and problem-solving approach",
    tags: ["Algorithms", "Logic"],
    difficulty: 3,
  },
  {
    name: "system-design",
    label: "System Design",
    description: "Architecture and scalability",
    icon: "Settings",
    questionType: "open_question" as const,
    requireCodeExample: false,
    expectedResponseLength: "long",
    evaluationCriteria: ["scalability", "architecture", "trade-offs"],
    instructions: "Design a scalable system architecture",
    tags: ["Architecture", "Scalability"],
    difficulty: 4,
  },
  {
    name: "best-practices",
    label: "Best Practices",
    description: "Code quality and maintainability",
    icon: "Target",
    questionType: "multiple_choice" as const,
    focusAreas: ["Code Quality", "SOLID Principles", "Design Patterns"],
    distractorComplexity: "moderate",
    instructions: "Test knowledge of software engineering best practices",
    tags: ["Best Practices", "Clean Code"],
    difficulty: 3,
  },
];

export async function seedDefaultPresetsAction() {
  try {
    // Delete existing presets
    await prisma.preset.deleteMany({});

    // Create new presets
    const created = await Promise.all(
      DEFAULT_PRESETS.map((preset) =>
        prisma.preset.create({
          data: preset,
        })
      )
    );

    updateTag("presets");

    return {
      success: true,
      message: `Successfully seeded ${created.length} presets`,
      count: created.length,
    };
  } catch (error) {
    console.error("Error seeding presets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to seed presets",
    };
  }
}
