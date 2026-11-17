import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    interview: { findMany: vi.fn(), findUnique: vi.fn() },
    scorecardCriterion: { findMany: vi.fn() },
    interviewParticipant: { findUnique: vi.fn() },
    kitItemNote: { findMany: vi.fn() },
    interviewerFeedback: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

import {
  getAgendaInterviews,
  getInterviewFeedbackPage,
  getInterviewForPreparation,
  getInterviewsByApplication,
  getInterviewLiveSession,
} from "@/lib/data/interviews";
import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

const db = prisma as any;

const listRow = {
  id: "int-1",
  applicationId: "app-1",
  round: 2,
  status: "scheduled",
  scheduledAt: new Date("2026-11-17T09:00:00Z"),
  durationMinutes: 60,
  meetingUrl: null,
  sequence: 1,
  kit: { status: "draft" },
  guide: { title: "Colloquio tecnico" },
  participants: [
    { id: "p-lead", userId: "u-lead", role: "lead", user: { id: "u-lead", name: "Anna" } },
    { id: "p-obs", userId: "u-obs", role: "observer", user: { id: "u-obs", name: "Luca" } },
  ],
  feedback: [
    {
      id: "fb-1",
      interviewerId: "u-obs",
      hireRecommendation: "yes",
      submittedAt: new Date("2026-11-18"),
      interviewer: { name: "Luca" },
    },
  ],
};

const preparationRow = {
  ...listRow,
  application: {
    positionId: "pos-1",
    candidate: { id: "cand-1", firstName: "Mario", lastName: "Rossi" },
    position: { id: "pos-1", title: "Dev" },
  },
  kit: {
    id: "kit-1",
    status: "draft",
    briefing: ["Punto", 3, null],
    hypotheses: [
      { criterionId: "c1", hypothesis: "Ipotesi valida", howToVerify: "Chiedi esempi" },
      { criterionId: "c1" },
    ],
    checklist: "invalid",
    missingSources: ["cv", "unknown"],
    sections: [{ id: "s1", title: "Tecnica", minutes: 30, order: 0, kind: "technical" }],
    items: [
      {
        id: "item-1",
        sectionId: "s1",
        text: "Domanda",
        followUps: [],
        criterionIds: ["c1"],
        anchors: { weak: "w" },
        required: true,
        order: 0,
        origin: "template",
        rationale: null,
        sourceRef: null,
        edited: false,
        covered: true,
      },
    ],
  },
};

const criteriaRows = [
  { id: "c1", name: "React", priority: "must", order: 0, archivedAt: null },
  { id: "c2", name: "SQL", priority: "nice", order: 1, archivedAt: new Date() },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getInterviewsByApplication", () => {
  it("is cached for hours with interviews, candidates, positions and guide tags", async () => {
    db.interview.findMany.mockResolvedValueOnce([listRow]);

    const rows = await getInterviewsByApplication("app-1");

    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith(
      "interviews",
      "candidates",
      "positions",
      "interview-guides",
    );
    const query = db.interview.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ applicationId: "app-1" });
    expect(query.orderBy).toEqual([{ round: "desc" }, { scheduledAt: "desc" }]);
    expect(query.select.feedback.where).toEqual({ submittedAt: { not: null } });
    expect(JSON.stringify(query.select)).not.toContain("notes");

    expect(rows).toEqual([
      {
        id: "int-1",
        applicationId: "app-1",
        round: 2,
        status: "scheduled",
        scheduledAt: listRow.scheduledAt,
        durationMinutes: 60,
        meetingUrl: null,
        sequence: 1,
        kitStatus: "draft",
        guideTitle: "Colloquio tecnico",
        participants: [
          { userId: "u-lead", name: "Anna", role: "lead" },
          { userId: "u-obs", name: "Luca", role: "observer" },
        ],
        submittedFeedback: [
          {
            id: "fb-1",
            interviewerId: "u-obs",
            interviewerName: "Luca",
            hireRecommendation: "yes",
            submittedAt: new Date("2026-11-18"),
          },
        ],
      },
    ]);
  });

  it("reads an unknown recommendation as null and a deleted guide as no title", async () => {
    db.interview.findMany.mockResolvedValueOnce([
      {
        ...listRow,
        guide: null,
        kit: null,
        feedback: [{ ...listRow.feedback[0], hireRecommendation: "forse" }],
      },
    ]);

    const [row] = await getInterviewsByApplication("app-1");
    expect(row.guideTitle).toBeNull();
    expect(row.kitStatus).toBeNull();
    expect(row.submittedFeedback[0].hireRecommendation).toBeNull();
  });
});

describe("getInterviewForPreparation", () => {
  it("is tagged with every collection it reads and the interview entity tag", async () => {
    db.interview.findUnique.mockResolvedValueOnce(null);

    expect(await getInterviewForPreparation("int-1")).toBeNull();
    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith(
      "interviews",
      "candidates",
      "positions",
      "scorecards",
      "interview-guides",
      "interview-int-1",
    );
    expect(db.scorecardCriterion.findMany).not.toHaveBeenCalled();
  });

  it("parses the kit JSON defensively and resolves the whole scorecard", async () => {
    db.interview.findUnique.mockResolvedValueOnce(preparationRow);
    db.scorecardCriterion.findMany.mockResolvedValueOnce(criteriaRows);

    const interview = await getInterviewForPreparation("int-1");

    const select = db.interview.findUnique.mock.calls[0][0].select;
    expect(JSON.stringify(select)).not.toContain("notes");
    expect(select.feedback.where).toEqual({ submittedAt: { not: null } });
    expect(db.scorecardCriterion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scorecard: { positionId: "pos-1" } },
        orderBy: { order: "asc" },
      }),
    );

    expect(interview?.kit).toMatchObject({
      id: "kit-1",
      briefing: ["Punto"],
      hypotheses: [
        { criterionId: "c1", hypothesis: "Ipotesi valida", howToVerify: "Chiedi esempi" },
      ],
      checklist: [],
      missingSources: ["cv"],
    });
    expect(interview?.kit?.items[0].anchors).toEqual({
      weak: "w",
      medium: "",
      strong: "",
    });
    expect(interview?.criteria).toEqual([
      { id: "c1", name: "React", priority: "must", order: 0, archived: false },
      { id: "c2", name: "SQL", priority: "nice", order: 1, archived: true },
    ]);
    expect(interview?.candidate).toEqual({
      id: "cand-1",
      firstName: "Mario",
      lastName: "Rossi",
    });
    expect(interview?.kitStatus).toBe("draft");
  });
});

describe("sourceRound of the kit questions", () => {
  const item = (id: string, origin: string, sourceRef: string | null) => ({
    ...preparationRow.kit.items[0],
    id,
    origin,
    sourceRef,
  });

  it("resolves the round of every cited scorecard with one query", async () => {
    db.interview.findUnique.mockResolvedValueOnce({
      ...preparationRow,
      kit: {
        ...preparationRow.kit,
        items: [
          item("prev-1", "previous_round", "feedback:fb-r1"),
          item("prev-2", "previous_round", "feedback:fb-r1"),
          item("prev-3", "previous_round", "feedback:fb-r2"),
          item("prev-unknown", "previous_round", "feedback:fb-deleted"),
          item("quiz", "quiz_answer", "quiz:q-1"),
          item("template", "template", null),
        ],
      },
    });
    db.scorecardCriterion.findMany.mockResolvedValueOnce(criteriaRows);
    db.interviewerFeedback.findMany.mockResolvedValueOnce([
      { id: "fb-r1", interview: { round: 1 } },
      { id: "fb-r2", interview: { round: 2 } },
    ]);

    const interview = await getInterviewForPreparation("int-1");

    expect(db.interviewerFeedback.findMany).toHaveBeenCalledTimes(1);
    expect(db.interviewerFeedback.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["fb-r1", "fb-r2", "fb-deleted"] } },
      select: { id: true, interview: { select: { round: true } } },
    });
    expect(
      interview?.kit?.items.map((row) => [row.id, row.sourceRound]),
    ).toEqual([
      ["prev-1", 1],
      ["prev-2", 1],
      ["prev-3", 2],
      // A scorecard that no longer exists: no round
      ["prev-unknown", null],
      ["quiz", null],
      ["template", null],
    ]);
  });

  it("makes no extra query when no question cites a scorecard", async () => {
    db.interview.findUnique.mockResolvedValueOnce(preparationRow);
    db.scorecardCriterion.findMany.mockResolvedValueOnce(criteriaRows);

    const interview = await getInterviewForPreparation("int-1");

    expect(db.interviewerFeedback.findMany).not.toHaveBeenCalled();
    expect(interview?.kit?.items[0].sourceRound).toBeNull();
  });

  it("is resolved in the live read too", async () => {
    db.interview.findUnique.mockResolvedValueOnce({
      ...preparationRow,
      kit: {
        ...preparationRow.kit,
        items: [item("prev-1", "previous_round", "feedback:fb-r1")],
      },
    });
    db.scorecardCriterion.findMany.mockResolvedValueOnce(criteriaRows);
    db.interviewerFeedback.findMany.mockResolvedValueOnce([
      { id: "fb-r1", interview: { round: 1 } },
    ]);
    db.interviewParticipant.findUnique.mockResolvedValueOnce(null);
    db.interviewerFeedback.findUnique.mockResolvedValueOnce(null);

    const session = await getInterviewLiveSession("int-2", "u1");

    expect(session?.kit?.items[0].sourceRound).toBe(1);
  });
});

describe("getAgendaInterviews", () => {
  it("is cached for minutes and lists scheduled and running interviews of open applications", async () => {
    db.interview.findMany.mockResolvedValueOnce([
      {
        id: "int-1",
        applicationId: "app-1",
        round: 1,
        status: "scheduled",
        scheduledAt: new Date("2026-11-17T09:00:00Z"),
        durationMinutes: 45,
        kit: null,
        application: {
          ownerId: "u-owner",
          candidate: { firstName: "Mario", lastName: "Rossi" },
          position: { title: "Dev" },
        },
        participants: [{ userId: "u1", role: "lead", user: { name: "Anna" } }],
      },
    ]);

    const rows = await getAgendaInterviews();

    expect(cacheLife).toHaveBeenCalledWith("minutes");
    expect(cacheTag).toHaveBeenCalledWith("interviews", "candidates", "positions");
    expect(db.interview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: ["scheduled", "in_progress"] },
          application: { stage: { notIn: ["rejected", "withdrawn"] } },
        },
        orderBy: { scheduledAt: "asc" },
      }),
    );
    expect(rows).toEqual([
      {
        id: "int-1",
        applicationId: "app-1",
        round: 1,
        status: "scheduled",
        scheduledAt: new Date("2026-11-17T09:00:00Z"),
        durationMinutes: 45,
        kitStatus: null,
        candidateName: "Mario Rossi",
        positionTitle: "Dev",
        ownerId: "u-owner",
        participants: [{ userId: "u1", name: "Anna", role: "lead" }],
      },
    ]);
  });
});

describe("getInterviewLiveSession", () => {
  it("is never cached and returns only the viewer's own notes", async () => {
    db.interview.findUnique.mockResolvedValueOnce(preparationRow);
    db.scorecardCriterion.findMany.mockResolvedValueOnce(criteriaRows);
    db.interviewParticipant.findUnique.mockResolvedValueOnce({ id: "p-lead", role: "lead" });
    db.kitItemNote.findMany.mockResolvedValueOnce([
      { kitItemId: "item-1", note: "ok", score: 4, evidenceQuote: null, updatedAt: new Date() },
    ]);
    db.interviewerFeedback.findUnique.mockResolvedValueOnce({ submittedAt: null });

    const session = await getInterviewLiveSession("int-1", "u-lead");

    expect(cacheTag).not.toHaveBeenCalled();
    expect(cacheLife).not.toHaveBeenCalled();
    expect(db.interviewParticipant.findUnique).toHaveBeenCalledWith({
      where: { interviewId_userId: { interviewId: "int-1", userId: "u-lead" } },
      select: { id: true, role: true },
    });
    expect(db.kitItemNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { participantId: "p-lead" } }),
    );
    expect(db.interviewerFeedback.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { interviewId_interviewerId: { interviewId: "int-1", interviewerId: "u-lead" } },
      }),
    );
    expect(session).toMatchObject({
      viewerParticipantId: "p-lead",
      viewerRole: "lead",
      viewerSubmitted: false,
      ownNotes: [expect.objectContaining({ kitItemId: "item-1", score: 4 })],
    });
  });

  it("gives a non-participant no notes and reports a submitted scorecard", async () => {
    db.interview.findUnique.mockResolvedValueOnce(preparationRow);
    db.scorecardCriterion.findMany.mockResolvedValueOnce(criteriaRows);
    db.interviewParticipant.findUnique.mockResolvedValueOnce(null);
    db.interviewerFeedback.findUnique.mockResolvedValueOnce({ submittedAt: new Date() });

    const session = await getInterviewLiveSession("int-1", "u-other");

    expect(db.kitItemNote.findMany).not.toHaveBeenCalled();
    expect(session).toMatchObject({
      viewerParticipantId: null,
      viewerRole: null,
      ownNotes: [],
      viewerSubmitted: true,
    });
  });

  it("returns null for a missing interview", async () => {
    db.interview.findUnique.mockResolvedValueOnce(null);
    expect(await getInterviewLiveSession("nope", "u1")).toBeNull();
  });
});

describe("getInterviewFeedbackPage", () => {
  const feedbackRow = (overrides: Record<string, unknown> = {}) => ({
    id: "fb-own",
    interviewerId: "u-lead",
    hireRecommendation: null,
    notes: "bozza",
    redFlags: [],
    standoutMoments: [],
    submittedAt: null,
    interviewer: { name: "Anna" },
    scores: [{ criterionId: "c1", score: 3, evidence: null }],
    ...overrides,
  });

  it("returns own draft and notes, and only the others' submitted scorecards with their published notes", async () => {
    db.interview.findUnique.mockResolvedValueOnce(preparationRow);
    db.scorecardCriterion.findMany.mockResolvedValueOnce(criteriaRows);
    db.interviewParticipant.findUnique.mockResolvedValueOnce({ id: "p-lead", role: "lead" });
    db.interviewerFeedback.findUnique.mockResolvedValueOnce(feedbackRow());
    db.kitItemNote.findMany
      .mockResolvedValueOnce([
        { kitItemId: "item-1", note: "mia", score: 4, evidenceQuote: null, kitItem: { criterionIds: ["c1"] } },
      ])
      .mockResolvedValueOnce([
        {
          kitItemId: "item-1",
          note: "di Luca",
          score: 2,
          evidenceQuote: "cit",
          participant: { userId: "u-obs" },
          kitItem: { text: "Domanda" },
        },
      ]);
    db.interviewerFeedback.findMany.mockResolvedValueOnce([
      feedbackRow({
        id: "fb-obs",
        interviewerId: "u-obs",
        hireRecommendation: "no",
        submittedAt: new Date("2026-11-18"),
        interviewer: { name: "Luca" },
      }),
    ]);

    const page = await getInterviewFeedbackPage("int-1", "u-lead");

    expect(cacheTag).not.toHaveBeenCalled();
    expect(cacheLife).not.toHaveBeenCalled();
    // Others: submitted only, never the viewer's
    expect(db.interviewerFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          interviewId: "int-1",
          interviewerId: { not: "u-lead" },
          submittedAt: { not: null },
        },
      }),
    );
    // Own notes by the viewer's participant row
    expect(db.kitItemNote.findMany.mock.calls[0][0].where).toEqual({
      participantId: "p-lead",
    });
    // Published notes: only of the interviewers who submitted
    expect(db.kitItemNote.findMany.mock.calls[1][0].where).toEqual({
      participant: { interviewId: "int-1", userId: { in: ["u-obs"] } },
    });

    expect(page?.ownFeedback).toMatchObject({ id: "fb-own", notes: "bozza", submittedAt: null });
    expect(page?.ownNotes).toEqual([
      { kitItemId: "item-1", criterionIds: ["c1"], note: "mia", score: 4, evidenceQuote: null },
    ]);
    expect(page?.othersSubmitted).toEqual([
      {
        id: "fb-obs",
        interviewerName: "Luca",
        hireRecommendation: "no",
        notes: "bozza",
        redFlags: [],
        standoutMoments: [],
        submittedAt: new Date("2026-11-18"),
        scores: [{ criterionId: "c1", score: 3, evidence: null }],
        liveNotes: [
          { kitItemId: "item-1", itemText: "Domanda", note: "di Luca", score: 2, evidenceQuote: "cit" },
        ],
      },
    ]);
  });

  it("reads no other notes when nobody else submitted", async () => {
    db.interview.findUnique.mockResolvedValueOnce(preparationRow);
    db.scorecardCriterion.findMany.mockResolvedValueOnce(criteriaRows);
    db.interviewParticipant.findUnique.mockResolvedValueOnce(null);
    db.interviewerFeedback.findUnique.mockResolvedValueOnce(null);
    db.interviewerFeedback.findMany.mockResolvedValueOnce([]);

    const page = await getInterviewFeedbackPage("int-1", "u-other");

    expect(db.kitItemNote.findMany).not.toHaveBeenCalled();
    expect(page).toMatchObject({
      viewerParticipant: null,
      ownFeedback: null,
      ownNotes: [],
      othersSubmitted: [],
    });
  });
});
