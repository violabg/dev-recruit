---
title: "testing"
tier: "PerContext"
keywords: ["test","vitest","mock","setup"]
intent: "When writing or changing tests (including interviews, kits, live notes, interviewer scorecards and the application decision)."
editable: true
---
# Testing conventions

Vitest is the runner; its API is in the official docs. Only this project's conventions are here.

## Layout and run

- Tests live in a top-level `tests/` tree mirroring the source tree (`tests/lib/actions/<name>.test.ts` tests the `<name>` actions module; likewise data, services, utils, schemas, hooks, components). Names end in `.test.ts`. Environment, globals, the `@` alias and the setup file are in the Vitest config: read it, do not assume.
- Validation before handing work back: `pnpm lint && pnpm test:run && pnpm build`. No coverage threshold.
- Only question fixtures have shared factories, from `@/tests/mocks`: `mockMultipleChoiceQuestion`, `mockOpenQuestion`, `mockCodeSnippetQuestion`, each taking a `Partial<FlexibleQuestion>` override. No factory for users, quizzes, positions, candidates, applications, assessments, evaluations, presets, scorecards, guides, interviews or kits: build those inline.

## Global mocks (active in every test)

The setup file mocks `next/cache` (`updateTag`, `revalidateTag`, `revalidatePath`, `cacheLife`, `cacheTag` as `vi.fn()`; `"use cache"` is inert under Vitest), `next/headers` (`cookies`, `headers`), `@/lib/prisma` (delegates for the main models, `$transaction(fn)` calls `fn` with the same mock) and `@/lib/auth-server` (`requireUser`, `getCurrentUser`). It clears mocks before each test and resets them after each test.

- Re-arm a signed-in user in your own `beforeEach`: `vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any)`.
- Delegates present: `quiz`, `question`, `quizQuestion`, `position`, `candidate`, `application`, `assessment` (including `updateMany`), `evaluation`, `preset`, `user`.
- Anything else needs a file-level `vi.mock("@/lib/prisma", …)` factory: `upsert` on any model, the `profile`, `referenceData`, `scorecard`, `scorecardCriterion`, `interviewGuide`, `guideSection`, `guideQuestion` delegates entirely, the interview models (`interview`, `interviewParticipant`, `interviewKit`, `kitSection`, `kitItem`, `kitItemNote`, `interviewerFeedback`, `criterionScore`) entirely, and the authentication models.
- Tests reaching `setApplicationStage` or `applicationHasEvidence` must provide an `interview` delegate with `count`, `findMany`, `updateMany`, even when not about interviews. A hand-built `tx` for `criterionHasEvidence` needs `criterionScore.count`, `kitItem.count` and `interviewKit.findMany`, besides the CV-evaluation delegate.
- The logger prints nothing in tests; mock it only to assert on it.

## Strategies for models without a global delegate

- Action and data-layer tests declare a file-level Prisma mock that also rebuilds `$transaction`. Action tests rebuild it to call the callback with the mock or with an explicit `tx`; data-layer mocks need read delegates only (cached reads open no transaction).
- A service that reads criteria through the scorecard service mocks that service instead: `vi.mock("@/lib/services/scorecards", () => ({ getActiveCriteria: vi.fn() }))`.
- A service receiving `tx` (`saveScorecard`, `syncInterviewGuide`, `syncQuizQuestions`, `createInterviewWithKit`, `syncInterviewParticipants`, `applyAllFeedbackCheck`, `syncKitItems`) gets a hand-built transaction of `vi.fn()` delegates; give it the delegates the save must NOT touch so the test can assert they were not called.
- Interview action tests partially mock `@/lib/services/interviews` with `importOriginal`, keeping the real `loadInterview` and `assertInterviewStatus`, and mock the isolated services (`interview-kits`, `ai/kit-generation`).
- The decision service test uses a hand-built client (`application`, `scorecardCriterion`, `evaluation`, `assessment`, `interview`, plus `kitItemNote` and `interviewerFeedback` to verify they are never called); for `recordApplicationDecision` the file-level mock provides `$transaction: (fn) => fn(tx)` and `advanceApplicationStage` is partially mocked with `importOriginal` or `vi.importActual` to verify the stage change.
- Special techniques: spy `redactBirthDate` and `sanitizeInput` to check their order; test the autosave hook with `renderHook`, a short debounce and `waitFor`, without fake timers; assert presentation maps directly, not the components consuming them.

## Idioms

```ts
vi.mock("@/lib/prisma", () => ({ default: { position: { findUnique: vi.fn() } } }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), unstable_rethrow: vi.fn() }));

import { createPositionAction } from "@/lib/actions/positions";
import { requireUser } from "@/lib/auth-server";

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
});
```

- `vi.mock(specifier, factory)` at the top, before importing the module under test, with `@/` specifiers; access mocks with `vi.mocked(fn)`.
- Actions: assert the returned result (`{ success: false, error }`, or `unwrap(result)` on success), never a thrown error. Assert the `invalidate*Cache` helper, not `updateTag`. Mock `next/navigation` when the action redirects.
- Services: they throw; assert with `rejects.toThrow("…")` or `rejects.toMatchObject({ code })`. Services import nothing from `next/*`.
- AI: mock `generateStructured` (or `aiQuizService`) in service and action tests; mock the `ai` SDK only when testing the AI layer. Assert call options with `toMatchObject` (`task`, `temperature`, `seed`). Pass `config: { retryDelay: 0 }` to skip backoff.
- Time: no fake timers. Time-dependent rules take a `now` argument (`assessmentState`, `acceptsAnswers`, `getRemainingSeconds`, `isApplicationStale`, `interview-calendar`); build dates relative to `Date.now()`.
- Network: stub `fetch` with `vi.stubGlobal`; never call a real database, network or AI provider.

## Prohibitions

- NEVER expect an action to throw (`rejects.toThrow`): actions return `{ success: false }`.
- NEVER assert invalidation by mocking `next/cache` instead of the cache helper.
- NEVER place tests next to source files instead of the mirrored `tests/` tree.
- NEVER reach for a `mockUser`/`mockQuiz`/`mockCandidate`/`mockScorecard`/`mockInterview` factory.
- NEVER rebuild `$transaction` in a data-layer test, or provide Prisma delegates to a service test that should receive a hand-built `tx`.
