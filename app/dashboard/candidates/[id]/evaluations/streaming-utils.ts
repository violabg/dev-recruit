import type { OverallEvaluation } from "@/lib/schemas";

/** Unescape JSON string values */
export function unescapeJsonString(str: string): string {
  return str.replace(/\\n/g, "\n").replace(/\\\"/g, '"');
}

/** Extract array items from partial JSON using regex */
export function extractArrayItems(content: string): string[] {
  return [...content.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) =>
    unescapeJsonString(m[1])
  );
}

/** Parse partial JSON fields as they stream in */
export function parsePartialEvaluation(
  text: string
): Partial<OverallEvaluation> {
  const partialEval: Partial<OverallEvaluation> = {};

  // Try to parse evaluation field
  const evalMatch = text.match(/"evaluation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (evalMatch) {
    partialEval.evaluation = unescapeJsonString(evalMatch[1]);
  }

  // Try to parse strengths array
  const strengthsMatch = text.match(/"strengths"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
  if (strengthsMatch) {
    const strengths = extractArrayItems(strengthsMatch[1]);
    if (strengths.length > 0) {
      partialEval.strengths = strengths;
    }
  }

  // Try to parse weaknesses array
  const weaknessesMatch = text.match(/"weaknesses"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
  if (weaknessesMatch) {
    const weaknesses = extractArrayItems(weaknessesMatch[1]);
    if (weaknesses.length > 0) {
      partialEval.weaknesses = weaknesses;
    }
  }

  // Try to parse recommendation field
  const recMatch = text.match(/"recommendation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (recMatch) {
    partialEval.recommendation = unescapeJsonString(recMatch[1]);
  }

  // Try to parse fitScore field
  const scoreMatch = text.match(/"fitScore"\s*:\s*(\d+)/);
  if (scoreMatch) {
    partialEval.fitScore = parseInt(scoreMatch[1], 10);
  }

  return partialEval;
}
