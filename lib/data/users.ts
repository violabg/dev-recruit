import prisma from "@/lib/prisma";
import { cacheLife } from "next/cache";

export type UserOption = { id: string; name: string; email: string };

/**
 * Every non-banned user ordered by name: the participant picker options.
 * No tag (there is no User tag): cached for minutes so a new colleague
 * appears quickly.
 */
export async function getUserOptions(): Promise<UserOption[]> {
  "use cache";
  cacheLife("minutes");

  return prisma.user.findMany({
    where: { banned: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}
