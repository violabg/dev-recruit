import {
  APPLICATION_STAGE_PRESENTATION,
  getApplicationStagePresentation,
  KANBAN_COLUMN_LABEL,
} from "@/components/applications/application-stage";
import { APPLICATION_STAGE_VALUES } from "@/lib/schemas";
import { KANBAN_COLUMNS } from "@/lib/utils/application-stage";
import { describe, expect, it } from "vitest";

describe("APPLICATION_STAGE_PRESENTATION", () => {
  it("labels every stage in Italian", () => {
    expect(
      APPLICATION_STAGE_VALUES.map(
        (stage) => APPLICATION_STAGE_PRESENTATION[stage].label,
      ),
    ).toEqual([
      "Candidato",
      "Screening",
      "Test",
      "Colloquio",
      "Decisione",
      "Offerta",
      "Assunto",
      "Scartato",
      "Ritirato",
    ]);
  });

  it.each(APPLICATION_STAGE_VALUES)(
    "tints %s with a stage-* token",
    (stage) => {
      const { badge, dot } = APPLICATION_STAGE_PRESENTATION[stage];
      expect(badge.startsWith("bg-stage-")).toBe(true);
      expect(badge).toMatch(/^bg-stage-[a-z]+\/10 text-stage-[a-z]+$/);
      expect(dot).toMatch(/^bg-stage-[a-z]+$/);
    },
  );

  it("follows the chosen colour families", () => {
    expect(APPLICATION_STAGE_PRESENTATION.applied.dot).toBe("bg-stage-pending");
    for (const stage of ["screening", "assessment", "interview", "decision"] as const) {
      expect(APPLICATION_STAGE_PRESENTATION[stage].dot).toBe("bg-stage-progress");
    }
    expect(APPLICATION_STAGE_PRESENTATION.offer.dot).toBe("bg-stage-done");
    expect(APPLICATION_STAGE_PRESENTATION.hired.dot).toBe("bg-stage-done");
    expect(APPLICATION_STAGE_PRESENTATION.rejected.dot).toBe("bg-stage-cancelled");
    expect(APPLICATION_STAGE_PRESENTATION.withdrawn.dot).toBe("bg-stage-expired");
  });
});

describe("getApplicationStagePresentation", () => {
  it("returns the shared entry for a known stage", () => {
    expect(getApplicationStagePresentation("offer")).toBe(
      APPLICATION_STAGE_PRESENTATION.offer,
    );
  });

  it("falls back to a muted badge for an unknown value", () => {
    expect(getApplicationStagePresentation("archived")).toEqual({
      label: "archived",
      badge: "bg-muted text-muted-foreground",
      dot: "bg-muted-foreground",
    });
  });
});

describe("KANBAN_COLUMN_LABEL", () => {
  it("labels every column, the closed one as Chiuse", () => {
    for (const key of KANBAN_COLUMNS) {
      expect(KANBAN_COLUMN_LABEL[key]).toBeTruthy();
    }
    expect(KANBAN_COLUMN_LABEL.closed).toBe("Chiuse");
    expect(KANBAN_COLUMN_LABEL.applied).toBe("Candidato");
  });
});
