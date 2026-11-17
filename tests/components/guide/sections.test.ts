import {
  GUIDE_SECTION,
  GUIDE_SECTIONS,
  guideHref,
} from "@/components/guide/sections";
import { describe, expect, it } from "vitest";

describe("guide sections", () => {
  it("numbers the sections in reading order", () => {
    expect(GUIDE_SECTIONS.map((section) => section.number)).toEqual(
      GUIDE_SECTIONS.map((_, index) => String(index + 1)),
    );
  });

  it("keeps the ids unique and URL-safe", () => {
    const ids = GUIDE_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("indexes every section by id", () => {
    for (const section of GUIDE_SECTIONS) {
      expect(GUIDE_SECTION[section.id]).toBe(section);
    }
  });

  it("builds the deep link of a section", () => {
    expect(guideHref("decisione")).toBe("/guida#decisione");
  });
});
