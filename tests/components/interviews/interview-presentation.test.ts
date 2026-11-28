import {
  getInterviewStatusPresentation,
  getKitItemOriginLabel,
  HIRE_RECOMMENDATION_LABEL,
  INTERVIEW_STATUS_PRESENTATION,
  KIT_ITEM_ORIGIN_LABEL,
  KIT_STATUS_PRESENTATION,
  LEGAL_REMINDER_TEXT,
  MISSING_SOURCE_LABEL,
  PARTICIPANT_ROLE_LABEL,
} from "@/components/interviews/interview-presentation";
import {
  HIRE_RECOMMENDATION_VALUES,
  INTERVIEW_MISSING_SOURCE_VALUES,
  INTERVIEW_PARTICIPANT_ROLE_VALUES,
  INTERVIEW_STATUS_VALUES,
  KIT_ITEM_ORIGIN_VALUES,
  KIT_STATUS_VALUES,
} from "@/lib/schemas";
import { describe, expect, it } from "vitest";

const STAGE_TOKEN = {
  scheduled: "stage-pending",
  in_progress: "stage-progress",
  completed: "stage-done",
  cancelled: "stage-cancelled",
  no_show: "stage-expired",
} as const;

describe("interview status presentation", () => {
  it("gives every status an Italian label and its stage tint", () => {
    for (const status of INTERVIEW_STATUS_VALUES) {
      const presentation = INTERVIEW_STATUS_PRESENTATION[status];
      const token = STAGE_TOKEN[status];
      expect(presentation.label).toBeTruthy();
      expect(presentation.badge).toBe(`bg-${token}/10 text-${token}`);
      expect(presentation.dot).toBe(`bg-${token}`);
      expect(getInterviewStatusPresentation(status)).toBe(presentation);
    }
    expect(INTERVIEW_STATUS_PRESENTATION.scheduled.label).toBe("Pianificato");
    expect(INTERVIEW_STATUS_PRESENTATION.no_show.label).toBe("Non presentato");
  });

  it("falls back to muted for an unknown status", () => {
    expect(getInterviewStatusPresentation("boh")).toEqual({
      label: "boh",
      badge: "bg-muted text-muted-foreground",
      dot: "bg-muted-foreground",
    });
  });
});

describe("other interview maps", () => {
  it("cover every value", () => {
    for (const value of KIT_STATUS_VALUES) {
      expect(KIT_STATUS_PRESENTATION[value].label).toBeTruthy();
    }
    for (const value of KIT_ITEM_ORIGIN_VALUES) {
      expect(KIT_ITEM_ORIGIN_LABEL[value]).toBeTruthy();
    }
    for (const value of INTERVIEW_PARTICIPANT_ROLE_VALUES) {
      expect(PARTICIPANT_ROLE_LABEL[value]).toBeTruthy();
    }
    for (const value of HIRE_RECOMMENDATION_VALUES) {
      expect(HIRE_RECOMMENDATION_LABEL[value]).toBeTruthy();
    }
    for (const value of INTERVIEW_MISSING_SOURCE_VALUES) {
      expect(MISSING_SOURCE_LABEL[value]).toBeTruthy();
    }
  });

  it("uses tints for the kit status", () => {
    expect(KIT_STATUS_PRESENTATION.draft).toEqual({
      label: "Preparazione in bozza",
      badge: "bg-warning/10 text-warning",
    });
    expect(KIT_STATUS_PRESENTATION.ready).toEqual({
      label: "Preparazione pronta",
      badge: "bg-success/10 text-success",
    });
  });

  it("keeps the fixed legal reminder", () => {
    expect(LEGAL_REMINDER_TEXT).toContain("art. 8 dello Statuto dei Lavoratori");
    expect(LEGAL_REMINDER_TEXT).toContain("D.Lgs. 198/2006");
    for (const topic of ["età", "famiglia", "figli", "religione", "salute"]) {
      expect(LEGAL_REMINDER_TEXT).toContain(topic);
    }
  });
});

describe("getKitItemOriginLabel", () => {
  it("names the round of a previous-round question when known", () => {
    expect(getKitItemOriginLabel("previous_round", 1)).toBe("Round 1");
    expect(getKitItemOriginLabel("previous_round", null)).toBe("Round precedente");
    expect(getKitItemOriginLabel("previous_round")).toBe("Round precedente");
  });

  it("uses the plain label for the other origins", () => {
    expect(getKitItemOriginLabel("cv", 2)).toBe("CV");
    expect(getKitItemOriginLabel("template", null)).toBe("Modello");
  });
});
