import type { ApplicationDetail } from "@/lib/data/applications";
import { buildApplicationTimeline } from "@/lib/utils/application-timeline";
import { describe, expect, it } from "vitest";

const detail = (overrides: Partial<ApplicationDetail> = {}): ApplicationDetail => ({
  id: "app1",
  stage: "applied",
  stageChangedAt: new Date("2026-01-01T09:00:00Z"),
  createdAt: new Date("2026-01-01T09:00:00Z"),
  owner: null,
  candidate: {
    id: "c1",
    firstName: "Mario",
    lastName: "Rossi",
    email: "mario@example.com",
    resumeUrl: null,
    doNotContact: false,
    doNotContactNote: null,
  },
  position: { id: "p1", title: "Dev", experienceLevel: "senior", status: "open" },
  assessments: [],
  resumeEvaluation: null,
  availableQuizzes: [],
  ...overrides,
});

describe("buildApplicationTimeline", () => {
  it("has the received entry only for a new application", () => {
    expect(buildApplicationTimeline(detail())).toEqual([
      {
        kind: "applied",
        at: new Date("2026-01-01T09:00:00Z"),
        label: "Candidatura ricevuta",
      },
    ]);
  });

  it("lists every fact newest first, with links on the test entries", () => {
    const entries = buildApplicationTimeline(
      detail({
        stage: "assessment",
        stageChangedAt: new Date("2026-01-05T09:00:00Z"),
        resumeEvaluation: {
          id: "e1",
          fitScore: 7,
          evaluation: null,
          strengths: [],
          weaknesses: [],
          recommendation: null,
          createdAt: new Date("2026-01-02T09:00:00Z"),
          criteriaAssessment: null,
        },
        assessments: [
          {
            id: "a1",
            token: "t",
            status: "completed",
            createdAt: new Date("2026-01-03T09:00:00Z"),
            startedAt: new Date("2026-01-04T09:00:00Z"),
            completedAt: new Date("2026-01-04T10:00:00Z"),
            quiz: { id: "q1", title: "React", timeLimit: 30 },
            evaluation: {
              id: "ev1",
              quizScore: 80,
              fitScore: 8,
              createdAt: new Date("2026-01-06T09:00:00Z"),
            },
          },
        ],
      }),
    );

    expect(entries.map((entry) => entry.kind)).toEqual([
      "assessment_evaluated",
      "stage_changed",
      "assessment_completed",
      "assessment_started",
      "assessment_sent",
      "resume_evaluated",
      "applied",
    ]);
    expect(entries.map((entry) => entry.label)).toEqual([
      "Test valutato: React",
      "Fase attuale: Test",
      "Test completato: React",
      "Test iniziato: React",
      "Test inviato: React",
      "CV valutato",
      "Candidatura ricevuta",
    ]);
    for (const entry of entries.filter((e) => e.kind.startsWith("assessment_"))) {
      expect(entry.href).toBe("/dashboard/assessments/a1");
    }
    expect(entries.find((e) => e.kind === "applied")?.href).toBeUndefined();
  });

  it("skips facts whose date is null", () => {
    const entries = buildApplicationTimeline(
      detail({
        assessments: [
          {
            id: "a1",
            token: "t",
            status: "pending",
            createdAt: new Date("2026-01-03T09:00:00Z"),
            startedAt: null,
            completedAt: null,
            quiz: { id: "q1", title: "React", timeLimit: null },
            evaluation: null,
          },
        ],
      }),
    );
    expect(entries.map((entry) => entry.kind)).toEqual([
      "assessment_sent",
      "applied",
    ]);
  });

  it("adds stage_changed only when the stage changed after creation", () => {
    const same = buildApplicationTimeline(detail({ stage: "screening" }));
    expect(same.some((e) => e.kind === "stage_changed")).toBe(false);

    const changed = buildApplicationTimeline(
      detail({
        stage: "screening",
        stageChangedAt: new Date("2026-01-02T09:00:00Z"),
      }),
    );
    expect(changed[0]).toMatchObject({
      kind: "stage_changed",
      label: "Fase attuale: Screening",
    });
  });
});
