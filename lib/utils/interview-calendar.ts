import { addDays } from "date-fns";
import type { InterviewParticipantRole, InterviewStatus } from "@/lib/schemas";

/**
 * Calendar helpers of interviews: day boundaries, Italian date text, the
 * copyable summary and the .ics file. Pure and client-safe: no server import,
 * no email anywhere.
 */

/** Days and displayed times are always those of Rome */
export const APP_TIME_ZONE = "Europe/Rome";

export type InterviewInviteData = {
  interviewId: string;
  round: number;
  candidateName: string;
  positionTitle: string;
  scheduledAt: Date | string;
  durationMinutes: number;
  meetingUrl: string | null;
  participants: { name: string; role: InterviewParticipantRole }[];
  status: InterviewStatus;
  sequence: number;
};

// Labels of the participant role in the plain-text summary
const SUMMARY_ROLE_LABEL: Record<InterviewParticipantRole, string> = {
  lead: "Conduttore",
  observer: "Osservatore",
};

const toDate = (value: Date | string) =>
  typeof value === "string" ? new Date(value) : value;

/** 'YYYY-MM-DD' of the date in APP_TIME_ZONE. */
export function dayKey(
  date: Date | string,
  timeZone: string = APP_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(toDate(date));
}

/** Key of the calendar day after the given 'YYYY-MM-DD' key */
function nextDayKey(key: string): string {
  return addDays(new Date(`${key}T00:00:00Z`), 1).toISOString().slice(0, 10);
}

/** true when date falls on the same day as now or the next day in APP_TIME_ZONE. */
export function isTodayOrTomorrow(date: Date | string, now: Date): boolean {
  const key = dayKey(date);
  const today = dayKey(now);
  return key === today || key === nextDayKey(today);
}

/** Italian date-time text, e.g. 'lunedì 17 novembre 2026, 10:30'. */
export function formatInterviewDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(toDate(date));
}

/** Plain-text Italian summary: candidate, position, round, date/time (Europe/Rome), duration, call link, participants with role. */
export function buildInterviewSummary(data: InterviewInviteData): string {
  const title = `Colloquio — Round ${data.round}`;
  const lines = [
    data.status === "cancelled" ? `ANNULLATO — ${title}` : title,
    `Candidato: ${data.candidateName}`,
    `Posizione: ${data.positionTitle}`,
    `Quando: ${formatInterviewDateTime(data.scheduledAt)} (durata ${data.durationMinutes} min)`,
  ];
  if (data.meetingUrl) lines.push(`Link: ${data.meetingUrl}`);
  lines.push("Partecipanti:");
  for (const participant of data.participants) {
    lines.push(
      `- ${participant.name} (${SUMMARY_ROLE_LABEL[participant.role]})`,
    );
  }
  return lines.join("\n");
}

/** UTC date-time of RFC 5545: yyyymmddThhmmssZ */
function icsDateTime(date: Date): string {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[-:]/g, "");
}

/** Escapes a TEXT value: backslash, semicolon, comma and newlines */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const encoder = new TextEncoder();
const octets = (value: string) => encoder.encode(value).length;

/** Folds a content line longer than 75 octets (CRLF + one space), never inside a character */
function foldIcsLine(line: string): string {
  if (octets(line) <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let limit = 75;
  for (const char of line) {
    if (octets(current) + octets(char) > limit) {
      parts.push(current);
      current = "";
      // Continuation lines start with a space, which counts as one octet
      limit = 74;
    }
    current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** VCALENDAR (PRODID '-//dev-recruit//Colloqui//IT', METHOD:PUBLISH) with one VEVENT: UID '{interviewId}@dev-recruit', DTSTAMP, DTSTART/DTEND UTC, SUMMARY 'Colloquio: {candidate} - {position} (round {n})', DESCRIPTION = summary, LOCATION/URL = meetingUrl, SEQUENCE = sequence, STATUS CANCELLED when status is cancelled else CONFIRMED. */
export function buildInterviewIcs(
  data: InterviewInviteData,
  now: Date = new Date(),
): string {
  const start = toDate(data.scheduledAt);
  const end = new Date(start.getTime() + data.durationMinutes * 60 * 1000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//dev-recruit//Colloqui//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${data.interviewId}@dev-recruit`,
    `DTSTAMP:${icsDateTime(now)}`,
    `DTSTART:${icsDateTime(start)}`,
    `DTEND:${icsDateTime(end)}`,
    `SUMMARY:${escapeIcsText(
      `Colloquio: ${data.candidateName} - ${data.positionTitle} (round ${data.round})`,
    )}`,
    `DESCRIPTION:${escapeIcsText(buildInterviewSummary(data))}`,
  ];
  if (data.meetingUrl) {
    lines.push(`LOCATION:${escapeIcsText(data.meetingUrl)}`);
    lines.push(`URL:${data.meetingUrl}`);
  }
  lines.push(
    `SEQUENCE:${data.sequence}`,
    `STATUS:${data.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  );

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

/** Italian weekday and date of a day, e.g. 'mercoledì 18 novembre' */
function formatAgendaDay(date: Date | string): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(toDate(date));
}

/** Agenda groups: first { key: 'overdue', title: 'Da aggiornare' } with scheduled rows whose day is before today; then one group per day from today ({ key: dayKey, title: 'Oggi' | 'Domani' | Italian weekday + date }), rows by scheduledAt; in_progress rows always in today's group. */
export function groupAgendaInterviews<
  T extends { status: InterviewStatus; scheduledAt: Date | string },
>(rows: readonly T[], now: Date): { key: string; title: string; rows: T[] }[] {
  const today = dayKey(now);
  const tomorrow = nextDayKey(today);
  const byTime = (a: T, b: T) =>
    toDate(a.scheduledAt).getTime() - toDate(b.scheduledAt).getTime();

  const overdue: T[] = [];
  const days = new Map<string, T[]>();

  for (const row of [...rows].sort(byTime)) {
    const key = row.status === "in_progress" ? today : dayKey(row.scheduledAt);
    if (key < today) {
      if (row.status === "scheduled") overdue.push(row);
      continue;
    }
    const dayRows = days.get(key) ?? [];
    dayRows.push(row);
    days.set(key, dayRows);
  }

  const groups: { key: string; title: string; rows: T[] }[] = [];
  if (overdue.length > 0) {
    groups.push({ key: "overdue", title: "Da aggiornare", rows: overdue });
  }

  for (const key of [...days.keys()].sort()) {
    const dayRows = days.get(key) ?? [];
    let title: string;
    if (key === today) title = "Oggi";
    else if (key === tomorrow) title = "Domani";
    else title = formatAgendaDay(dayRows[0].scheduledAt);
    groups.push({ key, title, rows: dayRows.sort(byTime) });
  }

  return groups;
}
