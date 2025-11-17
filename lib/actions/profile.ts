"use server";

import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

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

export async function updateProfile(formData: FormData) {
  try {
    const user = await requireUser();
    const headersList = await headers();

    const fullName = (formData.get("full_name") ?? "").toString().trim();
    const userName = (formData.get("user_name") ?? "").toString().trim();

    if (!fullName || !userName) {
      throw new Error("Nome completo e nome utente sono obbligatori");
    }

    await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        fullName,
        userName,
      },
      update: {
        fullName,
        userName,
      },
    });

    await auth.api.updateUser({
      headers: headersList,
      body: {
        name: fullName,
      },
    });

    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to update profile"
    );
  }
}

export async function updatePassword(formData: FormData) {
  try {
    await requireUser();

    const currentPassword = (formData.get("current_password") ?? "")
      .toString()
      .trim();
    const newPassword = (formData.get("new_password") ?? "").toString().trim();

    if (!currentPassword || !newPassword) {
      throw new Error("Password non valida");
    }

    const headersList = await headers();

    await auth.api.changePassword({
      headers: headersList,
      body: {
        currentPassword,
        newPassword,
      },
    });

    return { success: true };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to update password"
    );
  }
}
