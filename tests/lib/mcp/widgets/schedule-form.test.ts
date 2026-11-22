import { describe, expect, it } from "vitest";
import { scheduleFormWidget } from "@/lib/mcp/widgets/schedule-form";

const options = {
  application: {
    id: "app-1",
    candidateName: "Ada Lovelace",
    positionId: "pos-1",
    positionTitle: "Frontend",
    stage: "screening",
  },
  nextRound: 2,
  guides: [
    { id: "g1", title: "Tecnico", round: 1, durationMinutes: 60 },
    { id: "g2", title: "Culturale", round: 2, durationMinutes: 45 },
  ],
  teamMembers: [
    { id: "u1", name: "Paola" },
    { id: "u2", name: "Marco" },
  ],
  pendingProposals: [],
};

describe("scheduleFormWidget", () => {
  it("prefills as the dashboard: guide of the next round, the person as lead", () => {
    const widget = scheduleFormWidget(options, { applicationId: "app-1" }, "u2");

    expect(widget.prefill).toEqual({
      guideId: "g2",
      round: 2,
      scheduledAt: "",
      durationMinutes: 45,
      meetingUrl: "",
      participants: [{ userId: "u2", role: "lead" }],
    });
    expect(widget.url).toMatch(/\/dashboard\/applications\/app-1\/interviews\/new$/);
    expect(widget.guidesUrl).toMatch(/\/dashboard\/positions\/pos-1$/);
  });

  it("keeps the proposed values and drops unknown or repeated participants", () => {
    const widget = scheduleFormWidget(
      options,
      {
        applicationId: "app-1",
        guideId: "g1",
        round: 1,
        scheduledAt: "2026-11-25T10:00:00+01:00",
        durationMinutes: 30,
        participants: [
          { userId: "u1", role: "lead" },
          { userId: "ghost", role: "observer" },
          { userId: "u1", role: "observer" },
        ],
      },
      "u2",
    );

    expect(widget.prefill).toMatchObject({
      guideId: "g1",
      round: 1,
      scheduledAt: "2026-11-25T10:00:00+01:00",
      durationMinutes: 30,
      participants: [{ userId: "u1", role: "lead" }],
    });
  });

  it("falls back to the first guide when the proposed one does not exist", () => {
    const widget = scheduleFormWidget(options, { applicationId: "app-1", guideId: "nope", round: 5 }, "u1");
    expect(widget.prefill).toMatchObject({ guideId: "g1", durationMinutes: 60 });
  });
});
