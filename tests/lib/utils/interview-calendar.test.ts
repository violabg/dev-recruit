import {
  APP_TIME_ZONE,
  buildInterviewIcs,
  buildInterviewSummary,
  dayKey,
  formatInterviewDateTime,
  groupAgendaInterviews,
  isTodayOrTomorrow,
  type InterviewInviteData,
} from "@/lib/utils/interview-calendar";
import { describe, expect, it } from "vitest";

const invite = (
  overrides: Partial<InterviewInviteData> = {},
): InterviewInviteData => ({
  interviewId: "int-1",
  round: 2,
  candidateName: "Mario Rossi",
  positionTitle: "Sviluppatore backend",
  scheduledAt: "2026-11-17T09:30:00.000Z",
  durationMinutes: 60,
  meetingUrl: "https://meet.example.com/abc",
  participants: [
    { name: "Anna Bianchi", role: "lead" },
    { name: "Luca Verdi", role: "observer" },
  ],
  status: "scheduled",
  sequence: 1,
  ...overrides,
});

/** Unfold RFC 5545 content lines */
const unfold = (ics: string) => ics.replace(/\r\n /g, "");

describe("dayKey and isTodayOrTomorrow (Europe/Rome)", () => {
  it("uses the Rome calendar day, not UTC", () => {
    expect(APP_TIME_ZONE).toBe("Europe/Rome");
    // 23:30 UTC on 16 Nov is 00:30 of 17 Nov in Rome (CET, UTC+1)
    expect(dayKey("2026-11-16T23:30:00Z")).toBe("2026-11-17");
    expect(dayKey("2026-11-16T22:59:00Z")).toBe("2026-11-16");
    // Summer time (CEST, UTC+2)
    expect(dayKey("2026-07-01T22:30:00Z")).toBe("2026-07-02");
    expect(dayKey("2026-11-16T23:30:00Z", "UTC")).toBe("2026-11-16");
  });

  it("matches today and tomorrow around midnight", () => {
    // 23:30 Rome on 16 Nov
    const now = new Date("2026-11-16T22:30:00Z");
    expect(isTodayOrTomorrow("2026-11-16T08:00:00Z", now)).toBe(true);
    // 00:30 Rome on 17 Nov: tomorrow
    expect(isTodayOrTomorrow("2026-11-16T23:30:00Z", now)).toBe(true);
    // 23:30 Rome on 17 Nov: still tomorrow
    expect(isTodayOrTomorrow("2026-11-17T22:30:00Z", now)).toBe(true);
    // 00:30 Rome on 18 Nov: day after tomorrow
    expect(isTodayOrTomorrow("2026-11-17T23:30:00Z", now)).toBe(false);
    // Yesterday
    expect(isTodayOrTomorrow("2026-11-15T10:00:00Z", now)).toBe(false);
  });

  it("crosses the end of a month", () => {
    const now = new Date("2026-11-30T10:00:00Z");
    expect(isTodayOrTomorrow("2026-12-01T10:00:00Z", now)).toBe(true);
    expect(isTodayOrTomorrow("2026-12-02T10:00:00Z", now)).toBe(false);
  });
});

describe("formatInterviewDateTime", () => {
  it("writes Italian text in Rome time", () => {
    const text = formatInterviewDateTime("2026-11-17T09:30:00.000Z");
    expect(text).toContain("martedì");
    expect(text).toContain("17 novembre 2026");
    expect(text).toContain("10:30");
  });
});

describe("buildInterviewSummary", () => {
  it("lists candidate, position, date, duration, link and participants with role", () => {
    const lines = buildInterviewSummary(invite()).split("\n");
    expect(lines[0]).toBe("Colloquio — Round 2");
    expect(lines).toContain("Candidato: Mario Rossi");
    expect(lines).toContain("Posizione: Sviluppatore backend");
    expect(lines.find((line) => line.startsWith("Quando: "))).toMatch(
      /10:30.*\(durata 60 min\)$/,
    );
    expect(lines).toContain("Link: https://meet.example.com/abc");
    expect(lines).toContain("Partecipanti:");
    expect(lines).toContain("- Anna Bianchi (Conduttore)");
    expect(lines).toContain("- Luca Verdi (Osservatore)");
  });

  it("omits the link line when there is no call link", () => {
    const summary = buildInterviewSummary(invite({ meetingUrl: null }));
    expect(summary).not.toContain("Link:");
  });

  it("starts with ANNULLATO when cancelled", () => {
    const summary = buildInterviewSummary(invite({ status: "cancelled" }));
    expect(summary.split("\n")[0]).toBe("ANNULLATO — Colloquio — Round 2");
  });
});

describe("buildInterviewIcs", () => {
  const now = new Date("2026-11-16T10:00:00.000Z");

  it("builds one VEVENT with UID, UTC times, SEQUENCE and CONFIRMED status", () => {
    const ics = buildInterviewIcs(invite(), now);
    const lines = unfold(ics).split("\r\n");

    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("PRODID:-//dev-recruit//Colloqui//IT");
    expect(lines).toContain("CALSCALE:GREGORIAN");
    expect(lines).toContain("METHOD:PUBLISH");
    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines).toContain("UID:int-1@dev-recruit");
    expect(lines).toContain("DTSTAMP:20261116T100000Z");
    expect(lines).toContain("DTSTART:20261117T093000Z");
    expect(lines).toContain("DTEND:20261117T103000Z");
    expect(lines).toContain("SEQUENCE:1");
    expect(lines).toContain("STATUS:CONFIRMED");
    expect(lines).toContain("LOCATION:https://meet.example.com/abc");
    expect(lines).toContain("URL:https://meet.example.com/abc");
    expect(lines).toContain(
      "SUMMARY:Colloquio: Mario Rossi - Sviluppatore backend (round 2)",
    );
    expect(lines.at(-2)).toBe("END:VCALENDAR");
    // CRLF only, ending with CRLF
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("marks a cancelled interview as CANCELLED", () => {
    const ics = unfold(buildInterviewIcs(invite({ status: "cancelled", sequence: 3 }), now));
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("SEQUENCE:3");
  });

  it("omits LOCATION and URL without a call link", () => {
    const ics = buildInterviewIcs(invite({ meetingUrl: null }), now);
    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("URL:");
  });

  it("escapes backslash, semicolon, comma and newlines in text values", () => {
    const ics = unfold(
      buildInterviewIcs(
        invite({ positionTitle: "Dev, senior; back\\end" }),
        now,
      ),
    );
    expect(ics).toContain(
      "SUMMARY:Colloquio: Mario Rossi - Dev\\, senior\\; back\\\\end (round 2)",
    );
    const description = ics
      .split("\r\n")
      .find((line) => line.startsWith("DESCRIPTION:"));
    expect(description).toContain("\\n");
    expect(description).not.toContain("\n");
  });

  it("folds every line at 75 octets with CRLF and one space", () => {
    const ics = buildInterviewIcs(
      invite({ positionTitle: "Sviluppatore è".repeat(20) }),
      now,
    );
    const encoder = new TextEncoder();
    for (const line of ics.split("\r\n")) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(ics).toContain("\r\n ");
    // Folding never splits a multi-byte character
    expect(unfold(ics)).toContain("Sviluppatore è".repeat(20));
  });
});

describe("groupAgendaInterviews", () => {
  // 10:00 Rome on Monday 16 Nov 2026
  const now = new Date("2026-11-16T09:00:00Z");
  const row = (id: string, status: "scheduled" | "in_progress", at: string) => ({
    id,
    status,
    scheduledAt: at,
  });

  it("puts past scheduled rows in 'Da aggiornare' first, then one group per day", () => {
    const groups = groupAgendaInterviews(
      [
        row("later", "scheduled", "2026-11-20T09:00:00Z"),
        row("tomorrow", "scheduled", "2026-11-17T09:00:00Z"),
        row("today-late", "scheduled", "2026-11-16T15:00:00Z"),
        row("past", "scheduled", "2026-11-14T09:00:00Z"),
        row("today-early", "scheduled", "2026-11-16T08:00:00Z"),
      ],
      now,
    );

    expect(groups.map((group) => [group.key, group.title])).toEqual([
      ["overdue", "Da aggiornare"],
      ["2026-11-16", "Oggi"],
      ["2026-11-17", "Domani"],
      ["2026-11-20", "venerdì 20 novembre"],
    ]);
    expect(groups[0].rows.map((r) => r.id)).toEqual(["past"]);
    expect(groups[1].rows.map((r) => r.id)).toEqual(["today-early", "today-late"]);
  });

  it("keeps in-progress interviews in today's group even when started earlier", () => {
    const groups = groupAgendaInterviews(
      [row("running", "in_progress", "2026-11-15T09:00:00Z")],
      now,
    );
    expect(groups).toEqual([
      { key: "2026-11-16", title: "Oggi", rows: [expect.objectContaining({ id: "running" })] },
    ]);
  });

  it("returns no group without rows", () => {
    expect(groupAgendaInterviews([], now)).toEqual([]);
  });
});
