"use server";

import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordFormData,
  type ProfileFormData,
} from "@/lib/schemas";
import { headers } from "next/headers";
import {
  invalidateProfileCache,
  invalidateUserCache,
} from "@/lib/utils/cache-utils";
import { runAction, UserError } from "./run-action";

export async function updateProfileAction(values: ProfileFormData) {
  return runAction("updateProfileAction", async () => {
    const user = await requireUser();
    const payload = profileSchema.parse(values);
    const fullName = payload.full_name.trim();
    const userName = payload.user_name.trim();

    await prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, fullName, userName },
      update: { fullName, userName },
    });

    await auth.api.updateUser({
      headers: await headers(),
      body: { name: fullName },
    });

    invalidateProfileCache();
    invalidateUserCache(user.id);
  });
}

export async function updatePasswordAction(values: ChangePasswordFormData) {
  return runAction("updatePasswordAction", async () => {
    await requireUser();
    const payload = changePasswordSchema.parse(values);

    try {
      await auth.api.changePassword({
        headers: await headers(),
        body: {
          currentPassword: payload.current_password,
          newPassword: payload.new_password,
        },
      });
    } catch {
      // Better Auth rejects a wrong current password by throwing
      throw new UserError(
        "Impossibile aggiornare la password. Verifica la password attuale.",
      );
    }
  });
}
