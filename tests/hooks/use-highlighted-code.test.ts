/**
 * Unit tests for hooks/use-highlighted-code.ts
 *
 * Tests the plain-text fallback, the one-node-per-line output and the
 * cancellation of a superseded language load.
 */

import { useHighlightedCode } from "@/hooks/use-highlighted-code";
import { loadHighlighter } from "@/lib/highlighter";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/highlighter", () => ({
  loadHighlighter: vi.fn(),
}));

type LoadedHighlighter = NonNullable<
  Awaited<ReturnType<typeof loadHighlighter>>
>;

function createHighlighter(prefix: string): LoadedHighlighter {
  return {
    highlight: (code: string) => ({
      lines: code.split("\n").map((line) => `${prefix}${line}`),
      state: {
        lang: "fake",
        theme: "css-variables",
        themes: ["css-variables"],
      },
    }),
  } as unknown as LoadedHighlighter;
}

describe("useHighlightedCode", () => {
  it("returns plain lines while the highlighter is loading", () => {
    vi.mocked(loadHighlighter).mockReturnValue(new Promise<never>(() => {}));

    const { result } = renderHook(() =>
      useHighlightedCode("a\nb", "javascript")
    );

    expect(result.current).toEqual(["a", "b"]);
  });

  it("returns plain lines when the language has no grammar", async () => {
    vi.mocked(loadHighlighter).mockResolvedValue(null);

    const { result } = renderHook(() => useHighlightedCode("a\nb", "unknown"));

    await waitFor(() =>
      expect(loadHighlighter).toHaveBeenCalledWith("unknown")
    );

    expect(result.current).toEqual(["a", "b"]);
  });

  it("returns one node per highlighted line once the highlighter loads", async () => {
    vi.mocked(loadHighlighter).mockResolvedValue(createHighlighter("H:"));

    const { result } = renderHook(() =>
      useHighlightedCode("a\nb", "javascript")
    );

    await waitFor(() => expect(result.current).toEqual(["H:a", "H:b"]));
  });

  it("strips one trailing newline and does not render an extra line", async () => {
    vi.mocked(loadHighlighter).mockResolvedValue(createHighlighter("H:"));

    const { result } = renderHook(() =>
      useHighlightedCode("a\n", "javascript")
    );

    await waitFor(() => expect(result.current).toEqual(["H:a"]));
    expect(result.current).toHaveLength(1);
  });

  it("ignores a stale load when the language changes", async () => {
    let resolveFirst!: (value: LoadedHighlighter | null) => void;
    const first = new Promise<LoadedHighlighter | null>((resolve) => {
      resolveFirst = resolve;
    });
    const stale = createHighlighter("STALE:");
    const current = createHighlighter("CURRENT:");

    vi.mocked(loadHighlighter)
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce(current);

    const { result, rerender } = renderHook(
      ({ language }: { language: string }) =>
        useHighlightedCode("let a = 1;", language),
      { initialProps: { language: "javascript" } }
    );

    rerender({ language: "typescript" });

    await waitFor(() =>
      expect(result.current).toEqual(["CURRENT:let a = 1;"])
    );

    await act(async () => {
      resolveFirst(stale);
      await first;
    });

    expect(result.current).toEqual(["CURRENT:let a = 1;"]);
    expect(loadHighlighter).toHaveBeenNthCalledWith(1, "javascript");
    expect(loadHighlighter).toHaveBeenNthCalledWith(2, "typescript");
  });
});
