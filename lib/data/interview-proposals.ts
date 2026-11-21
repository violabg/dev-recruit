import prisma from "@/lib/prisma";
import {
  scheduleInterviewSchema,
  type InterviewParticipantRole,
} from "@/lib/schemas";
import { CacheTags } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";

/** A pending interview proposal as the Colloqui tab shows it */
export type InterviewProposalItem = {
  id: string;
  round: number;
  scheduledAt: Date;
  durationMinutes: number;
  meetingUrl: string | null;
  guideTitle: string | null;
  participants: { userId: string; name: string; role: InterviewParticipantRole }[];
  createdAt: Date;
  createdByName: string;
};

/**
 * Pending proposals of an application, oldest first, with guide title and
 * participant names. A payload that no longer parses is left out. Tagged
 * proposals: scheduling or discarding one shows on the next load.
 */
export async function getPendingInterviewProposals(
  applicationId: string,
): Promise<InterviewProposalItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.INTERVIEW_PROPOSALS, CacheTags.USERS, CacheTags.INTERVIEW_GUIDES);

  const rows = await prisma.interviewProposal.findMany({
    where: { applicationId, status: "pending" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      payload: true,
      createdAt: true,
      creator: { select: { name: true } },
    },
  });

  const proposals = rows.flatMap((row) => {
    const parsed = scheduleInterviewSchema.safeParse(row.payload);
    return parsed.success ? [{ ...row, payload: parsed.data }] : [];
  });
  if (!proposals.length) return [];

  const userIds = [
    ...new Set(proposals.flatMap((row) => row.payload.participants.map((p) => p.userId))),
  ];
  const guideIds = [...new Set(proposals.map((row) => row.payload.guideId))];
  const [users, guides] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
    prisma.interviewGuide.findMany({
      where: { id: { in: guideIds } },
      select: { id: true, title: true },
    }),
  ]);
  const userName = new Map(users.map((user) => [user.id, user.name]));
  const guideTitle = new Map(guides.map((guide) => [guide.id, guide.title]));

  return proposals.map((row) => ({
    id: row.id,
    round: row.payload.round,
    scheduledAt: new Date(row.payload.scheduledAt),
    durationMinutes: row.payload.durationMinutes,
    meetingUrl: row.payload.meetingUrl || null,
    guideTitle: guideTitle.get(row.payload.guideId) ?? null,
    participants: row.payload.participants.map((participant) => ({
      userId: participant.userId,
      name: userName.get(participant.userId) ?? "Utente non più presente",
      role: participant.role,
    })),
    createdAt: row.createdAt,
    createdByName: row.creator.name,
  }));
}
