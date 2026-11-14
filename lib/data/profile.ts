import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

/**
 * Profile of the signed-in user.
 *
 * Not cached: it depends on the session, so it must run at request time
 * inside a Suspense boundary.
 */

type PrismaProfile = Awaited<ReturnType<typeof prisma.profile.findUnique>>;

export type Profile = {
  id: string;
  fullName: string | null;
  userName: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
} | null;

const toProfilePayload = (profile: PrismaProfile): Profile => {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    fullName: profile.fullName ?? null,
    userName: profile.userName ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    createdAt: profile.createdAt?.toISOString() ?? null,
    updatedAt: profile.updatedAt?.toISOString() ?? null,
  };
};

export async function getProfile(): Promise<{
  profile: Profile;
  user: Awaited<ReturnType<typeof requireUser>> | null;
  error?: string;
}> {
  try {
    const user = await requireUser();

    const profile = await prisma.profile.findUnique({
      where: {
        userId: user.id,
      },
    });

    return {
      profile: toProfilePayload(profile),
      user,
    };
  } catch (error) {
    return {
      profile: null,
      user: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
