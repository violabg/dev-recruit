import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../lib/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Type for preset seed data (subset of PresetCreateInput)
type PresetSeedData = Omit<
  Prisma.PresetCreateInput,
  "id" | "createdAt" | "updatedAt"
>;

// Current presets from preset-generation-buttons.tsx
const PRESETS: PresetSeedData[] = [
  // Frontend Presets
  {
    name: "react-hooks",
    label: "React Hooks Expert",
    description: "Advanced React hooks and state management",
    icon: "Code",
    questionType: "multiple_choice",
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
    questionType: "code_snippet",
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
    questionType: "open_question",
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
    questionType: "multiple_choice",
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
    questionType: "code_snippet",
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
    questionType: "code_snippet",
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
    questionType: "open_question",
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
    questionType: "open_question",
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
    questionType: "multiple_choice",
    focusAreas: ["Code Quality", "SOLID Principles", "Design Patterns"],
    distractorComplexity: "moderate",
    instructions: "Test knowledge of software engineering best practices",
    tags: ["Best Practices", "Clean Code"],
    difficulty: 3,
  },
];

async function seedPresets() {
  try {
    console.log("Starting preset seeding...");

    // Delete existing presets to avoid duplicates
    try {
      const existingPresets = await prisma.preset.findMany();

      if (existingPresets.length > 0) {
        await prisma.preset.deleteMany({});
        console.log(`Deleted ${existingPresets.length} existing presets`);
      }
    } catch (error) {
      console.log("No existing presets to delete");
    }

    // Create new presets
    const createdPresets = await Promise.all(
      PRESETS.map((preset) =>
        prisma.preset.create({
          data: preset,
        })
      )
    );

    console.log(`✓ Successfully seeded ${createdPresets.length} presets`);

    // Print summary
    console.log("\nSeeded presets:");
    createdPresets.forEach((preset) => {
      console.log(`  - ${preset.label} (${preset.name})`);
    });
  } catch (error) {
    console.error("Error seeding presets:", error);
    process.exit(1);
  } finally {
    // Do not disconnect here; handled in main
  }
}

// Reference data imports from static arrays
import {
  contractTypes,
  databases,
  experienceLevels,
  frameworks,
  programmingLanguages,
  softSkills,
  tools,
} from "../components/positions/data";

async function seedReferenceData() {
  console.log("Starting reference data seeding...");
  const referenceDataSeed = [
    { category: "programmingLanguage", items: programmingLanguages },
    { category: "framework", items: frameworks },
    { category: "database", items: databases },
    { category: "tool", items: tools },
    { category: "soft_skill", items: softSkills },
    { category: "contract_type", items: contractTypes },
    { category: "experience_level", items: experienceLevels },
  ];

  for (const { category, items } of referenceDataSeed) {
    for (let i = 0; i < items.length; i++) {
      await prisma.referenceData.upsert({
        where: { category_label: { category, label: items[i] } },
        update: {},
        create: {
          category,
          label: items[i],
          order: i,
          isActive: true,
        },
      });
    }
  }

  console.log("✓ Reference data seeded");
}

async function main() {
  try {
    await seedPresets();
    await seedReferenceData();
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
