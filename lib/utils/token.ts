import prisma from "@/lib/prisma";
import { randomUUID } from "node:crypto";

/**
 * Generates a unique assessment token
 * Ensures uniqueness by checking against existing tokens in the database
 */
export const generateAssessmentToken = async (): Promise<string> => {
  while (true) {
    const token = randomUUID().replace(/-/g, "");

    const existing = await prisma.assessment.findUnique({
      where: { token },
      select: { id: true },
    });

    if (!existing) {
      return token;
    }
  }
};
