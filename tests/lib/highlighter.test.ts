/**
 * Unit tests for lib/highlighter.tsx
 *
 * Tests the language map, the alias resolution and loadHighlighter.
 */

import { loadHighlighter } from "@/lib/highlighter";
import { describe, expect, it, vi } from "vitest";

const canonicalLanguages = [
  ["javascript", "const a = 1;"],
  ["typescript", "const a: number = 1;"],
  ["python", "x = 1"],
  ["java", "class A {}"],
  ["csharp", "class A {}"],
  ["cpp", "int main() { return 0; }"],
  ["go", "package main"],
  ["ruby", "puts 1"],
  ["php", "<?php echo 1;"],
  ["swift", "let a = 1"],
  ["kotlin", "val a = 1"],
  ["html", "<div></div>"],
  ["css", "a { color: red; }"],
  ["c", "int main(void) { return 0; }"],
  ["rust", "fn main() {}"],
  ["dart", "void main() {}"],
  ["sql", "SELECT 1;"],
] as const;

const aliases = [
  ["js", "javascript"],
  ["ts", "typescript"],
  ["py", "python"],
  ["c#", "csharp"],
  ["csharp", "csharp"],
  ["c++", "cpp"],
  ["cpp", "cpp"],
] as const;

describe("loadHighlighter — canonical languages", () => {
  it.each(canonicalLanguages)(
    "resolves %s to its own grammar",
    async (language, code) => {
      const highlighter = await loadHighlighter(language);

      expect(highlighter).not.toBeNull();
      expect(highlighter!.highlight(code).state.lang).toBe(language);
    }
  );
});

describe("loadHighlighter — aliases", () => {
  it.each(aliases)("resolves %s to %s", async (alias, canonical) => {
    const highlighter = await loadHighlighter(alias);

    expect(highlighter).not.toBeNull();
    expect(highlighter!.highlight("const a = 1;").state.lang).toBe(canonical);
  });
});

describe("loadHighlighter — java", () => {
  it("resolves java to the java grammar and not to typescript", async () => {
    const highlighter = await loadHighlighter("java");

    expect(highlighter).not.toBeNull();
    const { state } = highlighter!.highlight("class A {}");

    expect(state.lang).toBe("java");
    expect(state.lang).not.toBe("typescript");
  });
});

describe("loadHighlighter — app language list", () => {
  it.each([
    ["Rust", "rust", "fn main() {}"],
    ["C", "c", "int main(void) { return 0; }"],
    ["Dart", "dart", "void main() {}"],
    ["SQL", "sql", "SELECT 1;"],
  ] as const)(
    "resolves the %s selector value to its own grammar",
    async (value, canonical, code) => {
      const highlighter = await loadHighlighter(value);

      expect(highlighter).not.toBeNull();
      const { state } = highlighter!.highlight(code);

      expect(state.lang).toBe(canonical);
      expect(state.lang).not.toBe("javascript");
    }
  );
});

describe("loadHighlighter — case-insensitive lookup", () => {
  it("resolves JavaScript written with a capital J", async () => {
    const highlighter = await loadHighlighter("JavaScript");

    expect(highlighter).not.toBeNull();
    expect(highlighter!.highlight("const a = 1;").state.lang).toBe("javascript");
  });
});

describe("loadHighlighter — unknown language", () => {
  it("resolves null for a language that is not in the map", async () => {
    expect(await loadHighlighter("unknown")).toBeNull();
    expect(await loadHighlighter("brainfuck")).toBeNull();
  });
});

describe("loadHighlighter — grammar import failure", () => {
  it("propagates the rejection of a grammar import", async () => {
    vi.resetModules();
    vi.doMock("shiki/langs/kotlin.mjs", () => ({
      get default(): never {
        throw new Error("grammar import failed");
      },
    }));

    const highlighterModule = await import("@/lib/highlighter");

    await expect(highlighterModule.loadHighlighter("kotlin")).rejects.toThrow(
      "grammar import failed"
    );

    vi.doUnmock("shiki/langs/kotlin.mjs");
    vi.resetModules();
  });
});
