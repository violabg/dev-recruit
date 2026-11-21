import { describe, expect, it } from "vitest";

import {
  actionCenterInputSchema,
  getApplicationInputSchema,
  getInterviewInputSchema,
  getPositionInputSchema,
  listInterviewsInputSchema,
  listPositionsInputSchema,
} from "@/lib/schemas";

describe("MCP read tool input schemas", () => {
  it("action_center defaults to the user's own work", () => {
    expect(actionCenterInputSchema.parse({})).toEqual({ mineOnly: true });
  });

  it("list_positions defaults to every status, first page", () => {
    expect(listPositionsInputSchema.parse({})).toEqual({ status: "all", page: 1 });
  });

  it("list_positions refuses a long search, an unknown status and page 0", () => {
    expect(() => listPositionsInputSchema.parse({ search: "x".repeat(101) })).toThrow(
      "Ricerca di al massimo 100 caratteri",
    );
    expect(() => listPositionsInputSchema.parse({ status: "archived" })).toThrow();
    expect(() => listPositionsInputSchema.parse({ page: 0 })).toThrow("La pagina parte da 1");
  });

  it("get_application omits the CV by default", () => {
    expect(getApplicationInputSchema.parse({ applicationId: "app-1" })).toEqual({
      applicationId: "app-1",
      includeCv: false,
    });
  });

  it("id inputs refuse an empty id with the Italian message", () => {
    for (const [schema, key] of [
      [getPositionInputSchema, "positionId"],
      [getApplicationInputSchema, "applicationId"],
      [getInterviewInputSchema, "interviewId"],
    ] as const) {
      expect(() => schema.parse({ [key]: "" })).toThrow("L'ID è obbligatorio");
    }
  });

  it("list_interviews accepts ISO dates with offset only", () => {
    expect(listInterviewsInputSchema.parse({})).toEqual({ mineOnly: false });
    expect(
      listInterviewsInputSchema.parse({ from: "2026-11-21T09:00:00+01:00" }).from,
    ).toBe("2026-11-21T09:00:00+01:00");
    expect(() => listInterviewsInputSchema.parse({ from: "domani" })).toThrow(
      "Data di inizio non valida",
    );
  });
});
