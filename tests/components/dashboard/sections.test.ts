import {
  NAV_FOOTER,
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
