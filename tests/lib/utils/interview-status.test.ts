import {
  allFeedbackSubmitted,
  canTransition,
  INTERVIEW_TRANSITIONS,
  personalizedQuestionCap,
  pickKitSection,
  toNextActionInterviewFacts,
} from "@/lib/utils/interview-status";
import { describe, expect, it } from "vitest";

const facts = (
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show",
  participantIds: string[] = ["lead", "obs"],
  submittedInterviewerIds: string[] = [],
) => ({ status, participantIds, submittedInterviewerIds });

describe("INTERVIEW_TRANSITIONS / canTransition", () => {
  it("allows start, cancel, no_show and reschedule only from scheduled", () => {
    for (const transition of ["start", "cancel", "no_show", "reschedule"] as const) {
      expect(INTERVIEW_TRANSITIONS[transition]).toEqual(["scheduled"]);
      expect(canTransition("scheduled", transition)).toBe(true);
      expect(canTransition("in_progress", transition)).toBe(false);
      expect(canTransition("completed", transition)).toBe(false);
      expect(canTransition("cancelled", transition)).toBe(false);
      expect(canTransition("no_show", transition)).toBe(false);
    }
  });

  it("allows complete only from in_progress", () => {
    expect(canTransition("in_progress", "complete")).toBe(true);
    expect(canTransition("scheduled", "complete")).toBe(false);
    expect(canTransition("completed", "complete")).toBe(false);
  });
});

describe("allFeedbackSubmitted", () => {
  it("is false with no interview at all", () => {
    expect(allFeedbackSubmitted([])).toBe(false);
  });

  it("is false when no interview is completed (only cancelled/no-show)", () => {
    expect(allFeedbackSubmitted([facts("cancelled"), facts("no_show")])).toBe(
      false,
    );
  });

  it("is true when every participant of every completed interview submitted", () => {
    expect(
      allFeedbackSubmitted([facts("completed", ["a", "b"], ["b", "a"])]),
    ).toBe(true);
  });

  it("requires the observers too", () => {
    expect(allFeedbackSubmitted([facts("completed", ["lead", "obs"], ["lead"])])).toBe(
      false,
    );
  });

  it("ignores cancelled and no-show interviews", () => {
    expect(
      allFeedbackSubmitted([
        facts("completed", ["a"], ["a"]),
        facts("cancelled", ["x"], []),
        facts("no_show", ["y"], []),
      ]),
    ).toBe(true);
  });

  it("is false while another round is scheduled or in progress", () => {
    const done = facts("completed", ["a"], ["a"]);
    expect(allFeedbackSubmitted([done, facts("scheduled")])).toBe(false);
    expect(allFeedbackSubmitted([done, facts("in_progress")])).toBe(false);
  });
});

describe("toNextActionInterviewFacts", () => {
  it("maps kitReady and feedbackMissing per interview", () => {
    expect(
      toNextActionInterviewFacts([
        { id: "i1", kitStatus: "ready", ...facts("scheduled") },
        { id: "i2", kitStatus: "draft", ...facts("scheduled") },
        { id: "i3", kitStatus: null, ...facts("completed", ["a", "b"], ["a"]) },
        { id: "i4", kitStatus: "ready", ...facts("completed", ["a"], ["a"]) },
        { id: "i5", kitStatus: "ready", ...facts("cancelled", ["a"], []) },
      ]),
    ).toEqual([
      { id: "i1", status: "scheduled", kitReady: true, feedbackMissing: false },
      { id: "i2", status: "scheduled", kitReady: false, feedbackMissing: false },
      { id: "i3", status: "completed", kitReady: false, feedbackMissing: true },
      { id: "i4", status: "completed", kitReady: true, feedbackMissing: false },
      { id: "i5", status: "cancelled", kitReady: true, feedbackMissing: false },
    ]);
  });
});

describe("personalizedQuestionCap", () => {
  it("is floor(2T/3) with template questions (personalized <= 40% of all)", () => {
    expect(personalizedQuestionCap(6, 60)).toBe(4);
    expect(personalizedQuestionCap(5, 60)).toBe(3);
    expect(personalizedQuestionCap(1, 60)).toBe(0);
    // 4 / (6 + 4) = 40%
    expect(4 / (6 + personalizedQuestionCap(6, 60))).toBeLessThanOrEqual(1);
  });

  it("is floor(0.4 * duration / 5) without template questions", () => {
    expect(personalizedQuestionCap(0, 60)).toBe(4);
    expect(personalizedQuestionCap(0, 45)).toBe(3);
    expect(personalizedQuestionCap(0, 10)).toBe(0);
  });
});

describe("pickKitSection", () => {
  const sections = [
    { id: "s-closing", kind: "closing" as const, order: 3 },
    { id: "s-intro", kind: "intro" as const, order: 0 },
    { id: "s-tech-2", kind: "technical" as const, order: 2 },
    { id: "s-tech-1", kind: "technical" as const, order: 1 },
  ];

  it("picks the first section of the kind by order", () => {
    expect(pickKitSection(sections, "technical")?.id).toBe("s-tech-1");
  });

  it("falls back to the last section that is not closing", () => {
    expect(pickKitSection(sections, "behavioral")?.id).toBe("s-tech-2");
  });

  it("falls back to the last section when all are closing", () => {
    const closings = [
      { id: "c1", kind: "closing" as const, order: 0 },
      { id: "c2", kind: "closing" as const, order: 1 },
    ];
    expect(pickKitSection(closings, "technical")?.id).toBe("c2");
  });

  it("returns null without sections", () => {
    expect(pickKitSection([], "technical")).toBeNull();
  });
});
