/**
 * Positions
 *
 * Position writes shared by the dashboard and MCP. Domain logic only: no
 * Next.js import and no cache call. It throws UserError for expected
 * failures; the callers invalidate the cache.
 */

import prisma from "@/lib/prisma";
import { positionFormSchema, type PositionFormData } from "@/lib/schemas";
import { assertActorEnabled, type Actor } from "./actor";
import { UserError } from "./user-error";

/** Creates a position in draft, authored by the actor. */
export async function createPosition(
  actor: Actor,
  input: PositionFormData,
): Promise<{ positionId: string }> {
  await assertActorEnabled(prisma, actor);
  const payload = positionFormSchema.parse(input);

  const position = await prisma.position.create({
    data: {
      title: payload.title,
      description: payload.description?.trim() || null,
      experienceLevel: payload.experienceLevel,
      skills: payload.skills,
      softSkills: payload.softSkills ?? [],
      contractType: payload.contractType?.trim() || null,
      // A new position is set up as a draft and opened from its page
      status: "draft",
      createdBy: actor.userId,
    },
    select: { id: true },
  });

  return { positionId: position.id };
}

/** Opens a position that is still a draft. */
export async function publishPositionDraft(
  actor: Actor,
  positionId: string,
): Promise<{ positionId: string }> {
  await assertActorEnabled(prisma, actor);

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    select: { status: true },
  });

  if (!position) {
    throw new UserError("Posizione non trovata");
  }
  if (position.status !== "draft") {
    throw new UserError("La posizione non è una bozza");
  }

  await prisma.position.update({
    where: { id: positionId },
    data: { status: "open" },
  });

  return { positionId };
}
