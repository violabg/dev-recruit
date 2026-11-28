import {
  NAV_FOOTER,
  NAV_GROUPS,
  SECTIONS,
  visibleNavItems,
} from "@/components/dashboard/sections";
import { describe, expect, it } from "vitest";

describe("visibleNavItems", () => {
  it("shows the admin-only users entry to an administrator", () => {
    expect(visibleNavItems(NAV_FOOTER, "admin").map((item) => item.key)).toEqual(
      ["settings", "users"]
    );
  });

  it("hides the users entry from a regular user", () => {
    expect(visibleNavItems(NAV_FOOTER, "user").map((item) => item.key)).toEqual([
      "settings",
    ]);
  });

  it("hides the users entry while the role is not known yet", () => {
    expect(visibleNavItems(NAV_FOOTER, null).map((item) => item.key)).toEqual([
      "settings",
    ]);
    expect(
      visibleNavItems(NAV_FOOTER, undefined).map((item) => item.key)
    ).toEqual(["settings"]);
  });
});

describe("users section", () => {
  it("points at the users page and is admin only", () => {
    expect(SECTIONS.users.href).toBe("/dashboard/settings/users");
    expect(SECTIONS.users.adminOnly).toBe(true);
    expect(SECTIONS.users.label).toBe("Utenti");
  });
});

describe("sidebar groups", () => {
  it("has an untitled flow group and a Gestione group", () => {
    expect(NAV_GROUPS).toHaveLength(2);
    expect(NAV_GROUPS[0].label).toBeUndefined();
    expect(NAV_GROUPS[0].items.map((item) => item.key)).toEqual([
      "overview",
      "positions",
      "candidates",
      "agenda",
    ]);
    expect(NAV_GROUPS[1].label).toBe("Gestione");
    expect(NAV_GROUPS[1].items.map((item) => item.key)).toEqual([
      "applications",
      "quizzes",
      "assessments",
      "presets",
    ]);
  });

  it("lists every entry in exactly one group", () => {
    const keys = NAV_GROUPS.flatMap((group) =>
      group.items.map((item) => item.key),
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("uses the current labels of the managed sections", () => {
    expect(SECTIONS.quizzes.label).toBe("Test");
    expect(SECTIONS.agenda.label).toBe("Agenda");
    expect(SECTIONS.applications.label).toBe("Candidature");
  });
});
