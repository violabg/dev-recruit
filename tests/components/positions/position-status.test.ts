import {
  getPositionStatusPresentation,
  POSITION_STATUS_PRESENTATION,
} from "@/components/positions/position-status";
import { describe, expect, it } from "vitest";

describe("POSITION_STATUS_PRESENTATION", () => {
  it("labels and tints every status", () => {
    expect(POSITION_STATUS_PRESENTATION).toEqual({
      draft: { label: "Bozza", badge: "bg-warning/10 text-warning" },
      open: { label: "Aperta", badge: "bg-success/10 text-success" },
      closed: { label: "Chiusa", badge: "bg-muted text-muted-foreground" },
    });
  });
});

describe("getPositionStatusPresentation", () => {
  it("returns the shared entry for a known status", () => {
    expect(getPositionStatusPresentation("open")).toBe(
      POSITION_STATUS_PRESENTATION.open,
    );
  });

  it("falls back to a muted badge for an unknown value", () => {
    expect(getPositionStatusPresentation("archived")).toEqual({
      label: "archived",
      badge: "bg-muted text-muted-foreground",
    });
  });
});
