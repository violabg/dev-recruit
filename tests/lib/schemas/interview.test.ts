import {
  InterviewParticipantRole,
  InterviewStatus,
  KitItemOrigin,
  KitStatus,
} from "@/lib/prisma/enums";
import {
  INTERVIEW_PARTICIPANT_ROLE_VALUES,
  INTERVIEW_STATUS_VALUES,
  interviewKitEditorSchema,
  KIT_ITEM_ORIGIN_VALUES,
  KIT_STATUS_VALUES,
  rescheduleInterviewSchema,
  saveKitItemNoteSchema,
  scheduleInterviewSchema,
  submitInterviewerFeedbackSchema,
} from "@/lib/schemas";
import { describe, expect, it } from "vitest";

const schedule = (overrides: Record<string, unknown> = {}) => ({
  applicationId: "app-1",
  guideId: "guide-1",
  round: 1,
  scheduledAt: "2026-11-17T10:00:00+01:00",
  durationMinutes: 60,
  meetingUrl: "https://meet.example.com/abc",
  participants: [
    { userId: "u1", role: "lead" },
    { userId: "u2", role: "observer" },
  ],
  ...overrides,
});

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("interview value arrays", () => {
  it("equal the Prisma enum values", () => {
    expect([...INTERVIEW_STATUS_VALUES].sort()).toEqual(
      Object.values(InterviewStatus).sort(),
    );
    expect([...INTERVIEW_PARTICIPANT_ROLE_VALUES].sort()).toEqual(
      Object.values(InterviewParticipantRole).sort(),
    );
    expect([...KIT_STATUS_VALUES].sort()).toEqual(Object.values(KitStatus).sort());
    expect([...KIT_ITEM_ORIGIN_VALUES].sort()).toEqual(
      Object.values(KitItemOrigin).sort(),
    );
  });
});

describe("scheduleInterviewSchema", () => {
  it("accepts a valid input, with or without a call link", () => {
    expect(scheduleInterviewSchema.safeParse(schedule()).success).toBe(true);
    expect(scheduleInterviewSchema.safeParse(schedule({ meetingUrl: "" })).success).toBe(true);
    expect(
      scheduleInterviewSchema.safeParse(schedule({ meetingUrl: undefined })).success,
    ).toBe(true);
    expect(
      scheduleInterviewSchema.safeParse(schedule({ scheduledAt: "2026-11-17T09:00:00.000Z" }))
        .success,
    ).toBe(true);
  });

  it("requires exactly one lead", () => {
    const twoLeads = scheduleInterviewSchema.safeParse(
      schedule({
        participants: [
          { userId: "u1", role: "lead" },
          { userId: "u2", role: "lead" },
        ],
      }),
    );
    expect(firstMessage(twoLeads)).toBe("Indica un solo conduttore");

    const noLead = scheduleInterviewSchema.safeParse(
      schedule({ participants: [{ userId: "u1", role: "observer" }] }),
    );
    expect(firstMessage(noLead)).toBe("Indica un solo conduttore");
  });

  it("refuses the same participant twice", () => {
    const result = scheduleInterviewSchema.safeParse(
      schedule({
        participants: [
          { userId: "u1", role: "lead" },
          { userId: "u1", role: "observer" },
        ],
      }),
    );
    expect(firstMessage(result)).toBe("Un partecipante è indicato più volte");
  });

  it("refuses 0 and 11 participants", () => {
    expect(
      firstMessage(scheduleInterviewSchema.safeParse(schedule({ participants: [] }))),
    ).toBe("Aggiungi almeno un partecipante");

    const eleven = Array.from({ length: 11 }, (_, i) => ({
      userId: `u${i}`,
      role: i === 0 ? "lead" : "observer",
    }));
    expect(
      firstMessage(scheduleInterviewSchema.safeParse(schedule({ participants: eleven }))),
    ).toBe("Al massimo 10 partecipanti");
  });

  it("refuses an invalid or offset-less date", () => {
    expect(
      firstMessage(scheduleInterviewSchema.safeParse(schedule({ scheduledAt: "domani" }))),
    ).toBe("Data e ora non valide");
    // datetime-local value sent as is
    expect(
      firstMessage(
        scheduleInterviewSchema.safeParse(schedule({ scheduledAt: "2026-11-17T10:00" })),
      ),
    ).toBe("Data e ora non valide");
  });

  it("refuses durations of 9 and 481 minutes", () => {
    expect(
      firstMessage(scheduleInterviewSchema.safeParse(schedule({ durationMinutes: 9 }))),
    ).toBe("Durata minima 10 minuti");
    expect(
      firstMessage(scheduleInterviewSchema.safeParse(schedule({ durationMinutes: 481 }))),
    ).toBe("Durata massima 480 minuti");
  });

  it("requires a guide and refuses an invalid call link", () => {
    expect(
      firstMessage(scheduleInterviewSchema.safeParse(schedule({ guideId: "" }))),
    ).toBe("Seleziona una guida colloquio");
    expect(
      firstMessage(scheduleInterviewSchema.safeParse(schedule({ meetingUrl: "non un link" }))),
    ).toBe("Link della call non valido");
  });
});

describe("rescheduleInterviewSchema", () => {
  it("applies the same participant rules", () => {
    const result = rescheduleInterviewSchema.safeParse({
      interviewId: "int-1",
      scheduledAt: "2026-11-17T10:00:00+01:00",
      durationMinutes: 60,
      participants: [{ userId: "u1", role: "observer" }],
    });
    expect(firstMessage(result)).toBe("Indica un solo conduttore");
  });
});

describe("interviewKitEditorSchema", () => {
  const kit = (briefing: string[]) => ({
    briefing,
    checklist: [],
    items: [],
  });

  it("accepts up to 5 briefing points and refuses more", () => {
    expect(interviewKitEditorSchema.safeParse(kit(["1", "2", "3", "4", "5"])).success).toBe(
      true,
    );
    expect(
      firstMessage(interviewKitEditorSchema.safeParse(kit(["1", "2", "3", "4", "5", "6"]))),
    ).toBe("Il briefing ha al massimo 5 punti");
  });

  it("defaults item origin to manual", () => {
    const parsed = interviewKitEditorSchema.parse({
      checklist: [],
      items: [{ sectionId: "s1", text: "Una domanda" }],
    });
    expect(parsed.items[0]).toMatchObject({
      origin: "manual",
      followUps: [],
      criterionIds: [],
      required: false,
    });
  });
});

describe("saveKitItemNoteSchema", () => {
  it("accepts 1-5 and null, refuses 0 and 6", () => {
    expect(saveKitItemNoteSchema.safeParse({ kitItemId: "i1", score: 1 }).success).toBe(true);
    expect(saveKitItemNoteSchema.safeParse({ kitItemId: "i1", score: 5 }).success).toBe(true);
    expect(saveKitItemNoteSchema.safeParse({ kitItemId: "i1", score: null }).success).toBe(true);
    expect(firstMessage(saveKitItemNoteSchema.safeParse({ kitItemId: "i1", score: 0 }))).toBe(
      "Voto da 1 a 5",
    );
    expect(firstMessage(saveKitItemNoteSchema.safeParse({ kitItemId: "i1", score: 6 }))).toBe(
      "Voto da 1 a 5",
    );
  });
});

describe("submitInterviewerFeedbackSchema", () => {
  const feedback = (hireRecommendation: string | null) => ({
    interviewId: "int-1",
    hireRecommendation,
    scores: [{ criterionId: "c1", score: null }],
  });

  it("requires the final recommendation", () => {
    const result = submitInterviewerFeedbackSchema.safeParse(feedback(null));
    expect(firstMessage(result)).toBe("Indica la raccomandazione finale");
    expect(result.error?.issues[0]?.path).toEqual(["hireRecommendation"]);
  });

  it("accepts a submission with a recommendation and unscored criteria", () => {
    expect(submitInterviewerFeedbackSchema.safeParse(feedback("yes")).success).toBe(true);
  });
});
