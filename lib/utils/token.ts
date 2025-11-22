import prisma from "@/lib/prisma";
import { randomUUID } from "node:crypto";

/**
 * Generates a unique interview token
 * Ensures uniqueness by checking against existing tokens in the database
 */
export const generateInterviewToken = async (): Promise<string> => {
  while (true) {
    const token = randomUUID().replace(/-/g, "");

    const existing = await prisma.interview.findUnique({
      where: { token },
      select: { id: true },
    });

    if (!existing) {
      return token;
    }
  }
};
