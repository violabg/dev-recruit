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
- Shared data factories (`mockUser`, `mockQuiz`, `mockPosition`, `mockCandidate`, `mockInterview`, `mockEvaluation`, `mockPreset`, question mocks) are exported from `@/tests/mocks`.
- Validation before handing work back: `pnpm lint && pnpm test:run && pnpm build`. There is no coverage threshold.

## Global mocks (already active in every test)

The single setup file mocks:
- `next/cache` (`updateTag`, `revalidateTag`, `revalidatePath`, `cacheLife`, `cacheTag` as `vi.fn()`; `"use cache"` is inert under Vitest);
- `next/headers` (`cookies`, `headers`);
- `@/lib/prisma` (default export with `vi.fn()` delegates for the main models; `$transaction(fn)` calls `fn` with the same mock);
- `@/lib/auth-server` (`requireUser`, `getCurrentUser`).

It clears mocks before each test and resets them after each test. Consequences:
- Re-arm a signed-in user in your own `beforeEach`: `vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any)`.
- A model or method missing from the global Prisma mock (for example `upsert`, `profile`, `behavioralRubric`, `referenceData`) needs a file-level `vi.mock("@/lib/prisma", …)` factory.
- The logger prints nothing in tests; mock it only to assert on it.

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
- Time: no fake timers. Time-dependent rules take a `now` argument (`interviewState`, `acceptsAnswers`, `getRemainingSeconds`); build dates relative to `Date.now()`.
- Network: stub `fetch` with `vi.stubGlobal`; never call a real database, network or AI provider.

## Common mistakes

- Forgetting to re-arm `requireUser` after the global reset: the action then fails with "Sessione scaduta".
- Expecting an action to throw (`rejects.toThrow`): actions return `{ success: false }`.
- Mocking `next/cache` to assert invalidation in an action test instead of mocking the cache helper.
- Placing tests next to source files instead of in the mirrored `tests/` tree.
