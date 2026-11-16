---
title: "testing"
tier: "PerContext"
keywords: ["test","vitest","mock","setup"]
intent: "When writing or changing tests."
editable: true
---
# Testing conventions

Vitest is the runner; its API is in the official docs. This document holds only this project's conventions.

## Layout and run

- Tests live in a separate top-level `tests/` tree that mirrors the source tree (`tests/lib/actions/<name>.test.ts` tests the `<name>` actions module, and so on for data, services, utils, schemas, hooks). File names end in `.test.ts`.
- Environment, globals, the `@` alias and the setup file are defined in the Vitest config: read it instead of assuming.
- Only question fixtures have shared factories, exported from `@/tests/mocks`: `mockMultipleChoiceQuestion`, `mockOpenQuestion`, `mockCodeSnippetQuestion`. Each takes a `Partial<FlexibleQuestion>` override. There is no factory for users, quizzes, positions, candidates, applications, assessments, evaluations, presets, scorecards or interview guides: build those objects inline in the test file.
- Validation before handing work back: `pnpm lint && pnpm test:run && pnpm build`. There is no coverage threshold.

## Global mocks (already active in every test)

The single setup file mocks:
- `next/cache` (`updateTag`, `revalidateTag`, `revalidatePath`, `cacheLife`, `cacheTag` as `vi.fn()`; `"use cache"` is inert under Vitest);
- `next/headers` (`cookies`, `headers`);
- `@/lib/prisma` (default export with `vi.fn()` delegates for the main models; `$transaction(fn)` calls `fn` with the same mock);
- `@/lib/auth-server` (`requireUser`, `getCurrentUser`).

It clears mocks before each test and resets them after each test. Consequences:
- Re-arm a signed-in user in your own `beforeEach`: `vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any)`.
- The global Prisma mock has delegates for `quiz`, `question`, `quizQuestion`, `position`, `candidate`, `application`, `assessment` (including `updateMany`), `evaluation`, `preset` and `user`.
- Anything outside that list needs a file-level `vi.mock("@/lib/prisma", …)` factory: `upsert` on any model, the `profile`, `behavioralRubric`, `referenceData`, `scorecard`, `scorecardCriterion`, `interviewGuide`, `guideSection` and `guideQuestion` delegates entirely, and the authentication models.
- The logger prints nothing in tests; mock it only to assert on it.

## Scorecard, interview-guide and quiz-criterion tests

The five scorecard and guide models (`scorecard`, `scorecardCriterion`, `interviewGuide`, `guideSection`, `guideQuestion`) have no delegate in the global mock. Three strategies cover them; pick the one that matches what the test exercises:

- Plans on actions and the data layer declare a file-level `vi.mock("@/lib/prisma", …)`. The action tests also rebuild `$transaction` so it calls the callback with the mock: `vi.mocked(prisma.$transaction).mockImplementation(((fn) => fn(prisma)) as any)`, or with an explicit `tx` object built inside the test. The data-layer mocks only need read delegates, because cached reads open no transaction.
- A test of a service that reads criteria through the scorecard service mocks that service instead of providing the delegates: `vi.mock("@/lib/services/scorecards", () => ({ getActiveCriteria: vi.fn() }))`.
- A service that receives `tx` (`saveScorecard`, `syncInterviewGuide`, `syncQuizQuestions`) is tested by passing a hand-built transaction object of `vi.fn()` delegates; the service never imports the Prisma client for those writes. Give that object the delegates the save must NOT touch (for example `quizQuestion` when saving a scorecard) so the test can assert they were not called.

The scorecard and guide test files added with the feature are `tests/lib/schemas/scorecard.test.ts`, `tests/lib/schemas/interview-guide.test.ts`, `tests/lib/schemas/quiz.test.ts`, `tests/lib/utils/criterion-keys.test.ts`, `tests/lib/utils/position-setup.test.ts`, `tests/lib/services/scorecards.test.ts`, `tests/lib/services/interview-guides.test.ts`, `tests/lib/services/quiz-questions.test.ts`, `tests/lib/services/ai/scorecard-generation.test.ts`, `tests/lib/services/ai/guide-generation.test.ts`, `tests/lib/services/ai/evaluation-prompts.test.ts`, `tests/lib/services/ai/models.test.ts`, `tests/lib/actions/scorecards.test.ts`, `tests/lib/actions/interview-guides.test.ts`, `tests/lib/actions/evaluations.test.ts`, `tests/lib/data/scorecards.test.ts` and `tests/lib/data/interview-guides.test.ts`. The layout is unchanged: every file mirrors its source module.

## Idioms

```ts
vi.mock("@/lib/prisma", () => ({
  default: { position: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}));
vi.mock("@/lib/utils/cache-utils", () => ({ invalidatePositionCache: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), unstable_rethrow: vi.fn() }));

import { createPositionAction } from "@/lib/actions/positions";
import { requireUser } from "@/lib/auth-server";

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
});

it("requires a signed-in user", async () => {
  vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));
  expect(await createPositionAction(values)).toMatchObject({ success: false });
});
```

- `vi.mock(specifier, factory)` at the top of the file, before importing the module under test, with `@/` specifiers. Access mocks with `vi.mocked(fn)`.
- Actions: assert the returned result (`{ success: false, error }`, or `unwrap(result)` on success), never a thrown error. Assert the `invalidate*Cache` helper call, not `updateTag`. Mock `next/navigation` when the action redirects.
- Services: they throw; assert with `await expect(fn()).rejects.toThrow("…")` or `.rejects.toMatchObject({ code })`. Services import nothing from `next/*`, so they are tested without Next.js mocks.
- AI: in service and action tests mock `generateStructured` (`vi.mock("@/lib/services/ai/generate", …)`) or `aiQuizService`; mock the `ai` SDK only when testing the AI layer itself. Assert call options such as `expect.objectContaining({ task: "evaluation", temperature: 0, seed: 42 })`. Pass `config: { retryDelay: 0 }` to avoid backoff waits.
- Time: no fake timers. Time-dependent rules take a `now` argument (`assessmentState`, `acceptsAnswers`, `getRemainingSeconds`, `isApplicationStale`); build dates relative to `Date.now()`.
- Network: stub `fetch` with `vi.stubGlobal`; never call a real database, network or AI provider.

## Common mistakes

- Forgetting to re-arm `requireUser` after the global reset: the action then fails with "Sessione scaduta".
- Expecting an action to throw (`rejects.toThrow`): actions return `{ success: false }`.
- Mocking `next/cache` to assert invalidation in an action test instead of mocking the cache helper.
- Placing tests next to source files instead of in the mirrored `tests/` tree.
- Reaching for a `mockUser`/`mockQuiz`/`mockCandidate`/`mockScorecard` factory: only the question factories exist.
- Calling `upsert` or a `profile`/`behavioralRubric`/`referenceData`/`scorecard`/`interviewGuide` model from a test without a file-level Prisma mock.
- Rebuilding `$transaction` in a data-layer test, which opens no transaction, or providing Prisma delegates to a service test that should receive a hand-built `tx`.
