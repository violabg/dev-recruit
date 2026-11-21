/**
 * Prompt text helpers.
 *
 * `prompt` is a tagged template that removes the source indentation of the
 * literal parts (never of the interpolated values, so code and CV text keep
 * their layout), drops whitespace-only lines left by empty conditionals and
 * collapses runs of blank lines: fewer tokens, same content.
 */

const LINE_INDENT = /\n([ \t]*)(?=\S)/g;

export function prompt(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  // Smallest indentation of the literal lines that carry text
  let minIndent = Number.POSITIVE_INFINITY;
  for (const part of strings) {
    for (const match of part.matchAll(LINE_INDENT)) {
      minIndent = Math.min(minIndent, match[1].length);
    }
  }
  const strip =
    Number.isFinite(minIndent) && minIndent > 0
      ? new RegExp(`\\n[ \\t]{0,${minIndent}}`, "g")
      : null;

  const text = strings.reduce((result, part, index) => {
    const literal = strip ? part.replace(strip, "\n") : part;
    const value = index < values.length ? String(values[index] ?? "") : "";
    return result + literal + value;
  }, "");

  return text
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Bullet list of the given lines, empty string when there are none */
export function bullets(
  lines: (string | number | false | null | undefined)[],
): string {
  return lines
    .filter((line): line is string => typeof line === "string" && line !== "")
    .map((line) => `- ${line}`)
    .join("\n");
}
