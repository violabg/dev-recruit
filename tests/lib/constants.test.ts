/**
 * Tests for Constants
 */

import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { describe, expect, it } from "vitest";

describe("DEFAULT_PAGE_SIZE", () => {
  it("should be a positive number", () => {
    expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
  });

  it("should be 10", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(10);
  });

  it("should be an integer", () => {
    expect(Number.isInteger(DEFAULT_PAGE_SIZE)).toBe(true);
  });
});
