/**
 * Scheduling form widget model: the options of the application (guides,
 * team), prefilled as the dashboard form does (guide of the next round, the
 * person as lead) and overridden by what the assistant proposed. A guide or
 * participant that does not exist is dropped.
 */

import type { OpenScheduleFormInput } from "@/lib/schemas";
import { links } from "../links";
import { formatDateTime } from "../render";
import type { McpSchedulingOptions } from "../scheduling";
import type { ScheduleFormWidget } from "./types";

/** Tool names the form calls: save the proposal, then confirm it */
export const SCHEDULE_FORM_TOOLS = {
  propose: "propose_interview_slot",
  confirm: "publish_draft",
} as const;

export function scheduleFormWidget(
  options: McpSchedulingOptions,
  input: OpenScheduleFormInput,
  currentUserId: string,
): ScheduleFormWidget {
  const round = input.round ?? options.nextRound;
  const guide =
    options.guides.find((item) => item.id === input.guideId) ??
    options.guides.find((item) => item.round === round) ??
    options.guides[0];

  const members = new Set(options.teamMembers.map((member) => member.id));
  const seen = new Set<string>();
  const participants = (input.participants ?? []).filter((participant) => {
    if (!members.has(participant.userId) || seen.has(participant.userId)) return false;
    seen.add(participant.userId);
    return true;
  });

  return {
    kind: "schedule-form",
    application: {
      id: options.application.id,
      candidateName: options.application.candidateName,
      positionTitle: options.application.positionTitle,
    },
    prefill: {
      guideId: guide?.id ?? "",
      round,
      scheduledAt: input.scheduledAt ?? "",
      durationMinutes: input.durationMinutes ?? guide?.durationMinutes ?? 60,
      meetingUrl: input.meetingUrl?.trim() ?? "",
      participants: participants.length
        ? participants
        : [{ userId: currentUserId, role: "lead" }],
    },
    guides: options.guides,
    teamMembers: options.teamMembers,
    pending: options.pendingProposals.map(
      (proposal) =>
        `Round ${proposal.payload.round}, ${formatDateTime(proposal.payload.scheduledAt)}`,
    ),
    tools: { ...SCHEDULE_FORM_TOOLS },
    url: links.newInterview(options.application.id),
    guidesUrl: links.position(options.application.positionId),
  };
}
