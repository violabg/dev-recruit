/**
 * Scheduling read model of the MCP tools: what a slot proposal needs (the
 * guides of the position, the team members, the next round) and the names a
 * proposal preview shows. Team members are names and ids only, no email.
 */

import { getApplicationDetail } from "@/lib/data/applications";
import { getInterviewGuidesByPosition } from "@/lib/data/interview-guides";
import { getInterviewsByApplication } from "@/lib/data/interviews";
import { getUserOptions } from "@/lib/data/users";
import type { ScheduleInterviewInput } from "@/lib/schemas";
import {
  listPendingProposals,
  type PendingProposal,
} from "@/lib/services/interview-proposals";

export interface McpSchedulingOptions {
  application: {
    id: string;
    candidateName: string;
    positionId: string;
    positionTitle: string;
    stage: string;
  };
  nextRound: number;
  guides: { id: string; title: string; round: number; durationMinutes: number }[];
  teamMembers: { id: string; name: string }[];
  pendingProposals: PendingProposal[];
}

const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`.trim();

/** Scheduling options of an application, or null when it does not exist. */
export async function buildSchedulingOptions(
  applicationId: string,
): Promise<McpSchedulingOptions | null> {
  const detail = await getApplicationDetail(applicationId);
  if (!detail) return null;

  const [guides, users, interviews, pendingProposals] = await Promise.all([
    getInterviewGuidesByPosition(detail.position.id),
    getUserOptions(),
    getInterviewsByApplication(applicationId),
    listPendingProposals(applicationId),
  ]);

  const lastRound = interviews.reduce(
    (max, interview) => Math.max(max, interview.round),
    0,
  );

  return {
    application: {
      id: detail.id,
      candidateName: fullName(detail.candidate),
      positionId: detail.position.id,
      positionTitle: detail.position.title,
      stage: detail.stage,
    },
    nextRound: lastRound + 1,
    guides: guides.map((guide) => ({
      id: guide.id,
      title: guide.title,
      round: guide.round,
      durationMinutes: guide.durationMinutes,
    })),
    teamMembers: users.map((user) => ({ id: user.id, name: user.name })),
    pendingProposals,
  };
}

/** Names of a proposal: candidate, position, guide, participants. */
export interface McpProposalContext {
  candidateName: string;
  positionTitle: string;
  guideTitle: string;
  participants: { name: string; role: ScheduleInterviewInput["participants"][number]["role"] }[];
}

export function proposalContext(
  options: McpSchedulingOptions,
  payload: ScheduleInterviewInput,
): McpProposalContext {
  const names = new Map(options.teamMembers.map((member) => [member.id, member.name]));
  return {
    candidateName: options.application.candidateName,
    positionTitle: options.application.positionTitle,
    guideTitle:
      options.guides.find((guide) => guide.id === payload.guideId)?.title ?? "Guida",
    participants: payload.participants.map((participant) => ({
      name: names.get(participant.userId) ?? "Utente",
      role: participant.role,
    })),
  };
}
