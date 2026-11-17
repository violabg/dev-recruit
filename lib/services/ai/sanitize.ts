/**
 * AI Service Sanitization
 *
 * Input sanitization utilities to prevent prompt injection and ensure safe inputs.
 */

/**
 * Sanitize input to prevent prompt injection attacks
 * Removes dangerous patterns and limits length to `maxLength` characters
 * (2000 by default; long candidate text such as a CV passes its own limit).
 */
export function sanitizeInput(input: string, maxLength: number = 2000): string {
  if (!input || typeof input !== "string") return "";

  // Remove potential prompt injection patterns
  const dangerous_patterns = [
    /ignore\s+previous\s+instructions/gi,
    /forget\s+everything\s+above/gi,
    /you\s+are\s+now/gi,
    /new\s+instructions/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /user\s*:/gi,
    /<\s*script[^>]*>/gi,
    /javascript\s*:/gi,
    /data\s*:/gi,
  ];

  let sanitized = input;
  dangerous_patterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[filtered]");
  });

  // Limit length to prevent token exhaustion
  return sanitized.substring(0, maxLength);
}

// ----------------------------------------------------------------------------
// Birth date removal
// ----------------------------------------------------------------------------

const MONTH_NAMES = [
  // Italian, full then 3-letter
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
  "gen",
  "feb",
  "mar",
  "apr",
  "mag",
  "giu",
  "lug",
  "ago",
  "set",
  "ott",
  "nov",
  "dic",
  // English, full then 3-letter
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "jan",
  "feb",
  "mar",
  "apr",
  "jun",
  "jul",
  "aug",
  "sept",
  "sep",
  "oct",
  "dec",
].join("|");

// Markers, matched only within one line ([ \t] never crosses a line break):
// "nato il", "nata il", "nato/a il", "nato a <luogo> il", "nata a <luogo> il",
// "data di nascita", "date of birth", "born on", "born", "DOB"
const BIRTH_MARKER =
  "\\b(?:nat[oa](?:\\/a)?(?:[ \\t]+a[ \\t]+[^\\r\\n]{1,80}?)?[ \\t]+il" +
  "|data[ \\t]+di[ \\t]+nascita" +
  "|date[ \\t]+of[ \\t]+birth" +
  "|born(?:[ \\t]+on)?" +
  "|dob)";

// Date formats: yyyy-mm-dd; dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy (1-2 digit day
// and month, 2 or 4 digit year); day + Italian or English month name + year
const BIRTH_DATE =
  "(?:\\d{4}-\\d{1,2}-\\d{1,2}(?!\\d)" +
  "|\\d{1,2}(?<sep>[\\/.-])\\d{1,2}\\k<sep>(?:\\d{4}|\\d{2})(?!\\d)" +
  `|\\d{1,2}(?:st|nd|rd|th|°|º)?[ \\t]+(?:${MONTH_NAMES})\\.?,?[ \\t]+\\d{4}(?!\\d))`;

const BIRTH_DATE_PATTERN = new RegExp(
  `(${BIRTH_MARKER}[ \\t]*:?[ \\t]*)${BIRTH_DATE}`,
  "gi",
);

/**
 * Replace with "[rimosso]" a date that follows, on the same line, a birth
 * marker ("nato il", "data di nascita", "date of birth", "DOB", ...). The
 * marker stays; only the date is replaced. A date with no marker before it is
 * left untouched (known limit). Run it BEFORE sanitizeInput, which rewrites
 * "Data:" patterns.
 */
export function redactBirthDate(text: string): string {
  if (!text || typeof text !== "string") return "";

  return text.replace(
    BIRTH_DATE_PATTERN,
    (_match, prefix: string) => `${prefix}[rimosso]`,
  );
}
