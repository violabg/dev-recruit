import type { ReactNode } from "react";
import {
  createCssVariablesTheme,
  createHighlighterCore,
  type GrammarState,
  type HighlighterCore,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

// The css-variables theme emits `var(--shiki-token-*)` as every token colour,
// so the stylesheet alone switches the palette when `.dark` is on the html
// element (app/globals.css) and no component reads the resolved theme.
const cssVariablesTheme = createCssVariablesTheme({
  name: "css-variables",
  variablePrefix: "--shiki-",
});

// Each grammar loads the first time its language is used.
const languages = {
  javascript: () => import("shiki/langs/javascript.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  java: () => import("shiki/langs/java.mjs"),
  csharp: () => import("shiki/langs/csharp.mjs"),
  cpp: () => import("shiki/langs/cpp.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  ruby: () => import("shiki/langs/ruby.mjs"),
  php: () => import("shiki/langs/php.mjs"),
  swift: () => import("shiki/langs/swift.mjs"),
  kotlin: () => import("shiki/langs/kotlin.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  c: () => import("shiki/langs/c.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  dart: () => import("shiki/langs/dart.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
};

const aliases: Record<string, keyof typeof languages> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  "c#": "csharp",
  csharp: "csharp",
  "c++": "cpp",
  cpp: "cpp",
};

let highlighter: Promise<HighlighterCore> | undefined;

function getHighlighter() {
  highlighter ??= createHighlighterCore({
    themes: [cssVariablesTheme],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });

  return highlighter;
}

function getLanguage(language: string): keyof typeof languages | null {
  const name = language.toLowerCase();

  if (name in languages) {
    return name as keyof typeof languages;
  }

  return aliases[name] ?? null;
}

// Loads a language and returns a highlighter for it, or null for a language
// that is not listed.
export async function loadHighlighter(language: string) {
  const lang = getLanguage(language);

  if (!lang) {
    return null;
  }

  const shiki = await getHighlighter();

  if (!shiki.getLoadedLanguages().includes(lang)) {
    await shiki.loadLanguage(languages[lang]);
  }

  return {
    highlight(
      code: string,
      state?: GrammarState
    ): { lines: ReactNode[]; state: GrammarState } {
      const tokens = shiki.codeToTokens(code, {
        lang,
        theme: "css-variables",
        grammarState: state,
      }).tokens;

      return {
        lines: tokens.map((line) =>
          line.map((token, index) => (
            <span key={index} style={{ color: token.color }}>
              {token.content}
            </span>
          ))
        ),
        state: shiki.getLastGrammarState(tokens)!,
      };
    },
  };
}
