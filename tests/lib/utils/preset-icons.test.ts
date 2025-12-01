/**
 * Tests for Preset Icons Utilities
 */

import { getPresetIcon, PRESET_ICON_OPTIONS } from "@/lib/utils/preset-icons";
import { describe, expect, it } from "vitest";

describe("PRESET_ICON_OPTIONS", () => {
  it("should have at least one icon option", () => {
    expect(PRESET_ICON_OPTIONS.length).toBeGreaterThan(0);
  });

  it("should have expected icon options", () => {
    const expectedIcons = [
      "Code",
      "Brain",
      "Database",
      "Layers",
      "Lightbulb",
      "Settings",
      "Shield",
      "Target",
      "Zap",
      "CheckCircle",
      "AlertCircle",
      "Rocket",
    ];

    expectedIcons.forEach((iconName) => {
      const option = PRESET_ICON_OPTIONS.find((opt) => opt.value === iconName);
      expect(option).toBeDefined();
      expect(option?.value).toBe(iconName);
    });
  });

  it("each option should have value, label, and icon", () => {
    PRESET_ICON_OPTIONS.forEach((option) => {
      expect(typeof option.value).toBe("string");
      expect(typeof option.label).toBe("string");
      expect(option.icon).toBeDefined();
      // LucideIcon is a ForwardRefExoticComponent (object with $$typeof)
      expect(option.icon).toHaveProperty("$$typeof");
    });
  });

  it("should have unique values", () => {
    const values = PRESET_ICON_OPTIONS.map((opt) => opt.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it("values and labels should be non-empty strings", () => {
    PRESET_ICON_OPTIONS.forEach((option) => {
      expect(option.value.length).toBeGreaterThan(0);
      expect(option.label.length).toBeGreaterThan(0);
    });
  });
});

describe("getPresetIcon", () => {
  it("should return icon for valid icon name", () => {
    const icon = getPresetIcon("Code");

    expect(icon).toBeDefined();
    // LucideIcon is a ForwardRefExoticComponent (object with $$typeof)
    expect(icon).toHaveProperty("$$typeof");
  });

  it("should return icon for each preset option", () => {
    PRESET_ICON_OPTIONS.forEach((option) => {
      const icon = getPresetIcon(option.value);
      expect(icon).toBe(option.icon);
    });
  });

  it("should return default icon for undefined", () => {
    const icon = getPresetIcon(undefined);

    expect(icon).toBeDefined();
    expect(icon).toBe(PRESET_ICON_OPTIONS[0].icon);
  });

  it("should return default icon for unknown icon name", () => {
    const icon = getPresetIcon("UnknownIcon");

    expect(icon).toBeDefined();
    expect(icon).toBe(PRESET_ICON_OPTIONS[0].icon);
  });

  it("should return default icon for empty string", () => {
    const icon = getPresetIcon("");

    expect(icon).toBeDefined();
    expect(icon).toBe(PRESET_ICON_OPTIONS[0].icon);
  });

  it("should be case-sensitive", () => {
    const icon = getPresetIcon("code"); // lowercase

    // Should return default since "code" !== "Code"
    expect(icon).toBe(PRESET_ICON_OPTIONS[0].icon);
  });

  it("should work for all available icons", () => {
    const iconNames = [
      "Code",
      "Brain",
      "Database",
      "Layers",
      "Lightbulb",
      "Settings",
      "Shield",
      "Target",
      "Zap",
      "CheckCircle",
      "AlertCircle",
      "Rocket",
    ];

    iconNames.forEach((name) => {
      const icon = getPresetIcon(name);
      expect(icon).toBeDefined();
      // Verify it's not the default by checking against the expected option
      const expectedOption = PRESET_ICON_OPTIONS.find(
        (opt) => opt.value === name
      );
      expect(icon).toBe(expectedOption?.icon);
    });
  });
});
