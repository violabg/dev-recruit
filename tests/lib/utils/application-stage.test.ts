import type { ApplicationStage } from "@/lib/schemas";
import {
  advanceStage,
  furthestApplication,
  isApplicationStale,
  isClosedStage,
  isOpenStage,
  KANBAN_COLUMNS,
  kanbanColumnOf,
  nextStage,
  STAGE_ORDER,
  stageRank,
  type StageEvent,
} from "@/lib/utils/application-stage";
import { describe, expect, it } from "vitest";

const ALL_STAGES: ApplicationStage[] = [
  "applied",
  "screening",
  "assessment",
  "interview",
  "decision",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
];

describe("advanceStage", () => {
  // Expected result of every event on every stage
  const table: Record<
    Exclude<StageEvent, "decision_recorded">,
    Record<ApplicationStage, ApplicationStage>
  > = {
    cv_evaluated: {
      applied: "screening",
      screening: "screening",
      assessment: "assessment",
      interview: "interview",
      decision: "decision",
      offer: "offer",
      hired: "hired",
      rejected: "rejected",
      withdrawn: "withdrawn",
    },
    assessment_sent: {
      applied: "assessment",
      screening: "assessment",
      assessment: "assessment",
      interview: "interview",
      decision: "decision",
      offer: "offer",
      hired: "hired",
      rejected: "rejected",
      withdrawn: "withdrawn",
    },
    interview_scheduled: {
      applied: "interview",
      screening: "interview",
      assessment: "interview",
      interview: "interview",
      decision: "decision",
      offer: "offer",
      hired: "hired",
      rejected: "rejected",
      withdrawn: "withdrawn",
    },
    all_feedback_submitted: {
      applied: "decision",
      screening: "decision",
      assessment: "decision",
      interview: "decision",
      decision: "decision",
      offer: "offer",
      hired: "hired",
      rejected: "rejected",
      withdrawn: "withdrawn",
    },
  };

  for (const [event, expectations] of Object.entries(table)) {
    it.each(ALL_STAGES)(`${event} from %s`, (stage) => {
      expect(advanceStage(stage, event as StageEvent)).toBe(
        expectations[stage],
      );
    });
  }

  const decisionTable: Record<
    "offer" | "hired" | "rejected",
    Record<ApplicationStage, ApplicationStage>
  > = {
    offer: {
      applied: "offer",
      screening: "offer",
      assessment: "offer",
      interview: "offer",
      decision: "offer",
      offer: "offer",
      hired: "hired",
      rejected: "rejected",
      withdrawn: "withdrawn",
    },
    hired: {
      applied: "hired",
      screening: "hired",
      assessment: "hired",
      interview: "hired",
      decision: "hired",
      offer: "hired",
      hired: "hired",
      rejected: "rejected",
      withdrawn: "withdrawn",
    },
    rejected: {
      applied: "rejected",
      screening: "rejected",
      assessment: "rejected",
      interview: "rejected",
      decision: "rejected",
      offer: "rejected",
      hired: "rejected",
      rejected: "rejected",
      withdrawn: "withdrawn",
    },
  };

  for (const [outcome, expectations] of Object.entries(decisionTable)) {
    it.each(ALL_STAGES)(
      `decision_recorded with outcome ${outcome} from %s`,
      (stage) => {
        expect(
          advanceStage(
            stage,
            "decision_recorded",
            outcome as "offer" | "hired" | "rejected",
          ),
        ).toBe(expectations[stage]);
      },
    );
  }

  it("never changes a closed application, whatever the event", () => {
    const events: StageEvent[] = [
      "cv_evaluated",
      "assessment_sent",
      "interview_scheduled",
      "all_feedback_submitted",
    ];
    for (const closed of ["rejected", "withdrawn"] as const) {
      for (const event of events) {
        expect(advanceStage(closed, event)).toBe(closed);
      }
      expect(advanceStage(closed, "decision_recorded", "hired")).toBe(closed);
    }
  });

  it("throws when decision_recorded has no outcome", () => {
    expect(() => advanceStage("decision", "decision_recorded")).toThrow(
      "decision_recorded requires an outcome",
    );
  });
});

describe("stage helpers", () => {
  it("stageRank follows STAGE_ORDER and is -1 for closed stages", () => {
    STAGE_ORDER.forEach((stage, index) => {
      expect(stageRank(stage)).toBe(index);
    });
    expect(stageRank("rejected")).toBe(-1);
    expect(stageRank("withdrawn")).toBe(-1);
  });

  it("isOpenStage is true from applied to offer only", () => {
    expect(
      ALL_STAGES.filter((stage) => isOpenStage(stage)),
    ).toEqual(["applied", "screening", "assessment", "interview", "decision", "offer"]);
    expect(isOpenStage("hired")).toBe(false);
  });

  it("isClosedStage is true for rejected and withdrawn only", () => {
    expect(ALL_STAGES.filter((stage) => isClosedStage(stage))).toEqual([
      "rejected",
      "withdrawn",
    ]);
  });

  it("nextStage returns the following step, null at the end and when closed", () => {
    expect(nextStage("applied")).toBe("screening");
    expect(nextStage("decision")).toBe("offer");
    expect(nextStage("offer")).toBe("hired");
    expect(nextStage("hired")).toBeNull();
    expect(nextStage("rejected")).toBeNull();
    expect(nextStage("withdrawn")).toBeNull();
  });
});

describe("furthestApplication", () => {
  const at = (iso: string) => new Date(iso);

  it("picks the highest stage", () => {
    const result = furthestApplication([
      { id: "a", stage: "screening" as const, stageChangedAt: at("2026-01-05") },
      { id: "b", stage: "interview" as const, stageChangedAt: at("2026-01-01") },
    ]);
    expect(result?.id).toBe("b");
  });

  it("breaks ties with the most recent stage change", () => {
    const result = furthestApplication([
      { id: "a", stage: "assessment" as const, stageChangedAt: at("2026-01-01") },
      { id: "b", stage: "assessment" as const, stageChangedAt: at("2026-01-03") },
    ]);
    expect(result?.id).toBe("b");
  });

  it("prefers an open application to a rejected one", () => {
    const result = furthestApplication([
      { id: "a", stage: "rejected" as const, stageChangedAt: at("2026-02-01") },
      { id: "b", stage: "applied" as const, stageChangedAt: at("2026-01-01") },
    ]);
    expect(result?.id).toBe("b");
  });

  it("hired beats every other stage", () => {
    const result = furthestApplication([
      { id: "a", stage: "offer" as const, stageChangedAt: at("2026-02-01") },
      { id: "b", stage: "hired" as const, stageChangedAt: at("2026-01-01") },
      { id: "c", stage: "rejected" as const, stageChangedAt: at("2026-03-01") },
    ]);
    expect(result?.id).toBe("b");
  });

  it("returns the most recent rejected one when only rejected and withdrawn", () => {
    const result = furthestApplication([
      { id: "a", stage: "withdrawn" as const, stageChangedAt: at("2026-03-01") },
      { id: "b", stage: "rejected" as const, stageChangedAt: at("2026-01-01") },
      { id: "c", stage: "rejected" as const, stageChangedAt: at("2026-02-01") },
    ]);
    expect(result?.id).toBe("c");
  });

  it("returns the most recent withdrawn one when only withdrawn", () => {
    const result = furthestApplication([
      { id: "a", stage: "withdrawn" as const, stageChangedAt: at("2026-01-01") },
      { id: "b", stage: "withdrawn" as const, stageChangedAt: at("2026-02-01") },
    ]);
    expect(result?.id).toBe("b");
  });

  it("returns null for an empty list", () => {
    expect(furthestApplication([])).toBeNull();
  });

  it("accepts ISO strings", () => {
    const result = furthestApplication([
      { id: "a", stage: "screening" as const, stageChangedAt: "2026-01-01T00:00:00.000Z" },
      { id: "b", stage: "screening" as const, stageChangedAt: "2026-01-02T00:00:00.000Z" },
    ]);
    expect(result?.id).toBe("b");
  });
});

describe("isApplicationStale", () => {
  const now = new Date("2026-11-15T12:00:00.000Z");
  const DAY = 24 * 60 * 60 * 1000;
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it("is false after 6 days", () => {
    expect(
      isApplicationStale({ stage: "screening", stageChangedAt: ago(6 * DAY) }, now),
    ).toBe(false);
  });

  it("is false after exactly 7 days", () => {
    expect(
      isApplicationStale({ stage: "screening", stageChangedAt: ago(7 * DAY) }, now),
    ).toBe(false);
  });

  it("is true after 7 days and 1 ms", () => {
    expect(
      isApplicationStale(
        { stage: "screening", stageChangedAt: ago(7 * DAY + 1) },
        now,
      ),
    ).toBe(true);
  });

  it.each(["hired", "rejected", "withdrawn"] as const)(
    "is false for %s however old",
    (stage) => {
      expect(
        isApplicationStale({ stage, stageChangedAt: ago(365 * DAY) }, now),
      ).toBe(false);
    },
  );

  it("accepts an ISO string", () => {
    expect(
      isApplicationStale(
        { stage: "applied", stageChangedAt: ago(8 * DAY).toISOString() },
        now,
      ),
    ).toBe(true);
  });
});

describe("kanban columns", () => {
  it("lists the seven open-path stages then closed", () => {
    expect(KANBAN_COLUMNS).toEqual([
      "applied",
      "screening",
      "assessment",
      "interview",
      "decision",
      "offer",
      "hired",
      "closed",
    ]);
  });

  it("maps closed stages to closed and others to themselves", () => {
    expect(kanbanColumnOf("rejected")).toBe("closed");
    expect(kanbanColumnOf("withdrawn")).toBe("closed");
    for (const stage of STAGE_ORDER) {
      expect(kanbanColumnOf(stage)).toBe(stage);
    }
  });
});
