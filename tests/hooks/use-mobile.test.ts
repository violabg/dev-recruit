/**
 * Unit tests for hooks/use-mobile.ts
 *
 * Tests mobile detection hook
 */

import { useIsMobile } from "@/hooks/use-mobile";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useIsMobile", () => {
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidth = window.innerWidth;

  let matchMediaListeners: Map<string, (event: MediaQueryListEvent) => void>;

  beforeEach(() => {
    matchMediaListeners = new Map();

    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(
        (event: string, listener: (e: MediaQueryListEvent) => void) => {
          matchMediaListeners.set(event, listener);
        }
      ),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, "innerWidth", {
      value: originalInnerWidth,
      writable: true,
    });
  });

  it("should return false for desktop width", () => {
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("should return true for mobile width", () => {
    Object.defineProperty(window, "innerWidth", {
      value: 500,
      writable: true,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("should return false at exactly 768px (breakpoint)", () => {
    Object.defineProperty(window, "innerWidth", {
      value: 768,
      writable: true,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("should return true at 767px (one below breakpoint)", () => {
    Object.defineProperty(window, "innerWidth", {
      value: 767,
      writable: true,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("should update when window is resized", () => {
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, "innerWidth", {
        value: 500,
        writable: true,
      });

      // Trigger the change listener
      const changeListener = matchMediaListeners.get("change");
      if (changeListener) {
        changeListener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe(true);
  });

  it("should cleanup listener on unmount", () => {
    const removeEventListener = vi.fn();

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener,
      dispatchEvent: vi.fn(),
    }));

    const { unmount } = renderHook(() => useIsMobile());

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });
});
