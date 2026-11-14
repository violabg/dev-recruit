import {
  getInterviewStatePresentation,
  INTERVIEW_STATE_PRESENTATION,
} from "@/components/interviews/interview-status";
import { describe, expect, it } from "vitest";

describe("INTERVIEW_STATE_PRESENTATION", () => {
  it("gives every state its Italian label and its stage token", () => {
    expect(INTERVIEW_STATE_PRESENTATION).toEqual({
      pending: {
        label: "In attesa",
        badge: "bg-stage-pending/10 text-stage-pending",
      },
      in_progress: {
        label: "In corso",
        badge: "bg-stage-progress/10 text-stage-progress",
      },
      completed: {
        label: "Completato",
        badge: "bg-stage-done/10 text-stage-done",
      },
      cancelled: {
        label: "Annullato",
        badge: "bg-stage-cancelled/10 text-stage-cancelled",
      },
      expired: {
        label: "Scaduto",
        badge: "bg-stage-expired/10 text-stage-expired",
      },
    });
  });
});

describe("getInterviewStatePresentation", () => {
  it("returns the presentation of a known state", () => {
    expect(getInterviewStatePresentation("in_progress")).toBe(
      INTERVIEW_STATE_PRESENTATION.in_progress,
    );
  });

  it("falls back to a neutral badge for an unknown status", () => {
    expect(getInterviewStatePresentation("archived")).toEqual({
      label: "archived",
      badge: "bg-muted text-muted-foreground",
    });
  });
});
