import { PrismaPg } from "@prisma/adapter-pg";
import "./load-env";
import { DEFAULT_PRESETS } from "../lib/constants/preset-defaults";
import { PrismaClient } from "../lib/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function seedPresets() {
  try {
    console.log("Starting preset seeding...");

    // Replace every preset with the default set in one transaction
    const presets = await prisma.$transaction(async (tx) => {
      await tx.preset.deleteMany({});
      return Promise.all(
        DEFAULT_PRESETS.map((preset) => tx.preset.create({ data: preset })),
      );
    });

    console.log(`✓ Successfully seeded ${presets.length} presets`);

    // Print summary
    console.log("\nSeeded presets:");
    presets.forEach((preset) => {
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
  aiSkills,
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
    { category: "ai_skill", items: aiSkills },
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
