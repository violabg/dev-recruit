import {
  buildApplicationStory,
  resolveOpenStops,
  type StoryFacts,
} from "@/lib/utils/application-story";
import type { NextAction, NextActionKind } from "@/lib/utils/next-action";
import { format } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import { describe, expect, it } from "vitest";

const DAY = 86_400_000;
const MINUTE = 60_000;
const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY);
const minutesAgo = (minutes: number) =>
  new Date(now.getTime() - minutes * MINUTE);

const dateLabel = (date: Date, pattern = "d MMM") =>
  format(date, pattern, { locale: itLocale });

const facts = (overrides: Partial<StoryFacts> = {}): StoryFacts => ({
  stage: "interview",
  hasResume: true,
  resumeEvaluation: { fitScore: 8 },
  assessments: [],
  interviews: [],
  decision: null,
  ...overrides,
});

const assessment = (
  overrides: Partial<StoryFacts["assessments"][number]> = {},
): StoryFacts["assessments"][number] => ({
  id: "a1",
  status: "completed",
  quizTitle: "React",
  createdAt: daysAgo(3),
  startedAt: daysAgo(3),
  completedAt: daysAgo(2),
  timeLimit: 30,
  quizScore: 78,
  ...overrides,
});

const interview = (
  overrides: Partial<StoryFacts["interviews"][number]> = {},
): StoryFacts["interviews"][number] => ({
  id: "i1",
  round: 1,
  status: "scheduled",
  scheduledAt: daysAgo(-1),
  kitStatus: "ready",
  submittedCount: 0,
  participantCount: 2,
  ...overrides,
});

const action = (
  kind: NextActionKind,
  overrides: Partial<NextAction> = {},
): NextAction => ({ kind, label: "", missingResume: false, ...overrides });

const currentKeys = (stops: ReturnType<typeof buildApplicationStory>) =>
  stops.filter((stop) => stop.state === "current").map((stop) => stop.key);

const stopByKey = (
  stops: ReturnType<typeof buildApplicationStory>,
  key: string,
) => {
  const stop = stops.find((candidate) => candidate.key === key);
  if (!stop) throw new Error(`Stop ${key} not found`);
  return stop;
};

describe("buildApplicationStory order", () => {
  it("puts CV, the tests oldest first, the interviews by round and Decisione last", () => {
    const stops = buildApplicationStory(
      facts({
        assessments: [
          assessment({ id: "late", createdAt: daysAgo(1) }),
          assessment({ id: "early", createdAt: daysAgo(5) }),
        ],
        interviews: [
          interview({ id: "i2", round: 2 }),
          interview({ id: "i1", round: 1 }),
        ],
      }),
      action("go_to_decision"),
      now,
    );

    expect(stops.map((stop) => stop.key)).toEqual([
      "cv",
      "test-early",
      "test-late",
      "interview-i1",
      "interview-i2",
      "decision",
    ]);
    expect(stops.map((stop) => stop.title)).toEqual([
      "CV",
      "Test",
      "Test",
      "Colloquio 1",
      "Colloquio 2",
      "Decisione",
    ]);
  });
});

describe("buildApplicationStory current stop", () => {
  it.each<[NextActionKind, Partial<NextAction>, StoryFacts, string]>([
    ["evaluate_cv", {}, facts({ stage: "screening", resumeEvaluation: null }), "cv"],
    [
      "send_assessment",
      {},
      facts({ stage: "assessment", assessments: [assessment()] }),
      "test-new",
    ],
    [
      "generate_evaluation",
      { assessmentId: "a1" },
      facts({ assessments: [assessment()] }),
      "test-a1",
    ],
    [
      "schedule_interview",
      {},
      facts({ stage: "interview", interviews: [] }),
      "interview-new",
    ],
    [
      "prepare_interview",
      { interviewId: "i1" },
      facts({ interviews: [interview({ kitStatus: "draft" })] }),
      "interview-i1",
    ],
    [
      "fill_feedback",
      { interviewId: "i1" },
      facts({ interviews: [interview({ status: "completed" })] }),
      "interview-i1",
    ],
    ["go_to_decision", {}, facts({ stage: "decision" }), "decision"],
    ["closed", {}, facts({ stage: "rejected" }), "decision"],
  ])("%s makes a single current stop", (kind, extra, storyFacts, key) => {
    const stops = buildApplicationStory(storyFacts, action(kind, extra), now);

    expect(currentKeys(stops)).toEqual([key]);
    expect(stops.filter((stop) => stop.state === "current")).toHaveLength(1);
  });

  it("send_assessment adds the pending Test after the last test", () => {
    const stops = buildApplicationStory(
      facts({ stage: "assessment", assessments: [assessment({ id: "a1" }), assessment({ id: "a2" })] }),
      action("send_assessment"),
      now,
    );

    expect(stops.map((stop) => stop.key)).toEqual([
      "cv",
      "test-a1",
      "test-a2",
      "test-new",
      "decision",
    ]);
    expect(stopByKey(stops, "test-new")).toMatchObject({
      state: "current",
      pending: true,
    });
  });

  it("schedule_interview adds a pending interview with the next round", () => {
    const stops = buildApplicationStory(
      facts({
        stage: "interview",
        interviews: [
          interview({ id: "i1", round: 1 }),
          interview({ id: "i3", round: 3 }),
        ],
      }),
      action("schedule_interview"),
      now,
    );

    expect(stops.map((stop) => stop.key)).toEqual([
      "cv",
      "interview-i1",
      "interview-i3",
      "interview-new",
      "decision",
    ]);
    expect(stopByKey(stops, "interview-new")).toMatchObject({
      state: "current",
      title: "Colloquio 4",
      pending: true,
    });
  });

  it.each<[StoryFacts["stage"], StoryFacts, string]>([
    ["screening", facts({ stage: "screening" }), "cv"],
    ["assessment", facts({ stage: "assessment", assessments: [assessment({ id: "a1" }), assessment({ id: "a2" })] }), "test-a2"],
    ["interview", facts({ stage: "interview", interviews: [interview({ id: "i1", round: 1 }), interview({ id: "i2", round: 2 })] }), "interview-i2"],
    ["offer", facts({ stage: "offer" }), "decision"],
  ])(
    "advance_stage in %s points at the last stop of that stage",
    (_stage, storyFacts, key) => {
      const stops = buildApplicationStory(
        storyFacts,
        action("advance_stage", { targetStage: "interview" }),
        now,
      );

      expect(currentKeys(stops)).toEqual([key]);
    },
  );
});

describe("buildApplicationStory done stops", () => {
  const outcomeOf = (storyAssessment: StoryFacts["assessments"][number]) =>
    buildApplicationStory(
      facts({ assessments: [{ ...storyAssessment, id: "a1" }] }),
      action("prepare_interview", { interviewId: "i1" }),
      now,
    ).find((stop) => stop.key === "test-a1")?.outcomeText;

  it("writes the CV outcome with the fit score", () => {
    const stops = buildApplicationStory(
      facts({ resumeEvaluation: { fitScore: 7 } }),
      action("prepare_interview", { interviewId: "i1" }),
      now,
    );

    expect(stopByKey(stops, "cv")).toMatchObject({
      state: "done",
      outcomeText: "Valutato · 7/10",
    });
  });

  it("writes the pending state with the creation date", () => {
    const createdAt = daysAgo(1);

    expect(
      outcomeOf(
        assessment({
          status: "pending",
          startedAt: null,
          completedAt: null,
          quizScore: null,
          createdAt,
        }),
      ),
    ).toBe(`React · In attesa · ${dateLabel(createdAt)}`);
  });

  it("writes the in-progress state without a date", () => {
    expect(
      outcomeOf(
        assessment({
          status: "in_progress",
          startedAt: minutesAgo(5),
          completedAt: null,
          timeLimit: 60,
          quizScore: null,
        }),
      ),
    ).toBe("React · In corso");
  });

  it("writes a completed test with its score", () => {
    expect(
      outcomeOf(
        assessment({
          status: "completed",
          startedAt: minutesAgo(90),
          completedAt: minutesAgo(30),
          quizScore: 78,
        }),
      ),
    ).toBe("React · Completato · 78/100");
  });

  it("writes a completed test without a score as to be evaluated", () => {
    expect(
      outcomeOf(
        assessment({
          status: "completed",
          startedAt: minutesAgo(90),
          completedAt: minutesAgo(30),
          quizScore: null,
        }),
      ),
    ).toBe("React · Completato · da valutare");
  });

  it("derives the expired state from startedAt and the time limit", () => {
    expect(
      outcomeOf(
        assessment({
          status: "in_progress",
          startedAt: daysAgo(2),
          completedAt: null,
          timeLimit: 30,
          quizScore: null,
        }),
      ),
    ).toBe("React · Scaduto");
  });

  it("writes the cancelled state", () => {
    expect(
      outcomeOf(
        assessment({
          status: "cancelled",
          startedAt: null,
          completedAt: null,
          quizScore: null,
        }),
      ),
    ).toBe("React · Annullato");
  });

  const interviewOutcome = (
    overrides: Partial<StoryFacts["interviews"][number]>,
  ) =>
    buildApplicationStory(
      facts({ interviews: [interview({ id: "i1", ...overrides })] }),
      action("go_to_decision"),
      now,
    ).find((stop) => stop.key === "interview-i1")?.outcomeText;

  it.each<[StoryFacts["interviews"][number]["status"], string]>([
    ["scheduled", "Pianificato"],
    ["in_progress", "In corso"],
    ["completed", "Concluso"],
    ["cancelled", "Annullato"],
    ["no_show", "Non presentato"],
  ])("writes the interview status %s as %s", (status, label) => {
    const scheduledAt = daysAgo(2);
    const feedback = status === "completed" ? " · feedback 0/2" : "";

    expect(
      interviewOutcome({ status, scheduledAt, kitStatus: null }),
    ).toBe(`${label} · ${dateLabel(scheduledAt, "d MMM HH:mm")}${feedback}`);
  });

  it("adds the ready preparation and the feedback count", () => {
    const scheduledAt = daysAgo(-2);

    expect(
      interviewOutcome({
        status: "scheduled",
        scheduledAt,
        kitStatus: "ready",
      }),
    ).toBe(`Pianificato · ${dateLabel(scheduledAt, "d MMM HH:mm")} · Preparazione pronta`);

    expect(
      interviewOutcome({
        status: "completed",
        scheduledAt,
        kitStatus: "ready",
        submittedCount: 1,
        participantCount: 2,
      }),
    ).toBe(`Concluso · ${dateLabel(scheduledAt, "d MMM HH:mm")} · feedback 1/2`);
  });

  it("writes the recorded decision outcome", () => {
    const decidedAt = daysAgo(1);
    const stops = buildApplicationStory(
      facts({ decision: { outcome: "offer", decidedAt } }),
      action("prepare_interview", { interviewId: "i1" }),
      now,
    );

    expect(stopByKey(stops, "decision")).toMatchObject({
      state: "done",
      outcomeText: `Offerta · ${dateLabel(decidedAt)}`,
    });
  });
});

describe("buildApplicationStory future stops", () => {
  it("states when the CV and the Decisione open", () => {
    const stops = buildApplicationStory(
      facts({
        resumeEvaluation: null,
        interviews: [interview({ id: "i1" })],
        decision: null,
      }),
      action("prepare_interview", { interviewId: "i1" }),
      now,
    );

    expect(stopByKey(stops, "cv")).toMatchObject({
      state: "future",
      unlockText: "Si apre quando c'è il CV",
    });
    expect(stopByKey(stops, "decision")).toMatchObject({
      state: "future",
      unlockText: "Si apre quando tutti i feedback dei colloqui sono inviati",
    });
  });
});

describe("resolveOpenStops", () => {
  const stops = buildApplicationStory(
    facts({
      assessments: [assessment({ id: "a1" }), assessment({ id: "a2" })],
      interviews: [
        interview({ id: "i1", round: 1 }),
        interview({ id: "i2", round: 2 }),
      ],
    }),
    action("go_to_decision"),
    now,
  );

  it.each<[string, string[]]>([
    ["cv", ["cv"]],
    ["test", ["test-a2"]],
    ["colloqui", ["interview-i1", "interview-i2"]],
    ["decisione", ["decision"]],
  ])("opens the %s stop", (rawTab, keys) => {
    expect(resolveOpenStops(rawTab, stops)).toEqual(keys);
  });

  it.each([undefined, "panoramica"])(
    "opens nothing for %s (the current stop is always open)",
    (rawTab) => {
      expect(resolveOpenStops(rawTab, stops)).toEqual([]);
    },
  );
});
