# Copilot Instructions — DevRecruit

An AI-powered technical recruitment platform for generating quizzes, evaluating candidates, and managing interviews.

## Architecture at a Glance

| Layer            | Key Files                                                                     | Pattern                                                                         |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Routing**      | `app/dashboard/layout.tsx`, `app/dashboard/[section]/page.tsx`                | Next.js 16 App Router, server components by default                             |
| **Data queries** | `lib/data/*.ts`                                                               | `"use cache"` + `cacheLife()` + `cacheTag()` for cache components               |
| **Mutations**    | `lib/actions/*.ts`                                                            | Server actions wrapped in `runAction()`, returning `ActionResult`               |
| **Domain logic** | `lib/services/*.ts` (interview-evaluation, resume-evaluation, quiz-questions) | Rules shared by actions and route handlers; testable without Next.js            |
| **AI service**   | `lib/services/ai/` (generate.ts, models.ts, core.ts, prompts.ts, evaluation-prompts.ts) | One `generateStructured()` owns model choice, retry, timeout and fallback |
| **Storage**      | `lib/services/r2-storage.ts`, unpdf                                           | Resume uploads to Cloudflare R2, PDF text extraction for evaluations            |
| **Database**     | Prisma (Neon PostgreSQL)                                                      | Reusable Question entity with QuizQuestion join table, polymorphic Evaluation   |
| **Styling**      | Tailwind v4 + OKLCH colors                                                    | Base primitives in `components/ui/`, dashboard shell in `components/dashboard/` |

## Critical Patterns

### 1. Cache Components (Static Shell + Streaming Content)

Every dashboard page uses Suspense with cache components. Example structure:

```tsx
// Static tab shell (cached)
<Tabs defaultValue="questions">
  <TabsList>Domande</TabsList>
  // Streaming content per tab (inside Suspense)
  <TabsContent value="questions">
    <Suspense fallback={<Skeleton />}>
      <QuestionContent /> // Inside: 'use cache' for data
    </Suspense>
  </TabsContent>
</Tabs>
```

**Rule:** Keep Prisma/AI calls in `'use cache'` scopes. Wrap runtime APIs (`cookies()`, `headers()`) in Suspense boundaries with skeleton fallbacks (see `app/dashboard/candidates/page.tsx` for live example).

### 2. Questions via Join Table

Questions are **database entities** linked to quizzes via the `QuizQuestion` join table:

- Write path: a quiz and its ordered questions are saved together by `upsertQuizAction()` (`lib/actions/quizzes.ts`)
- The join table is written only by `syncQuizQuestions()` in `lib/services/quiz-questions.ts`
- Fetch with ordering: see `lib/data/quizzes.ts` — loads with `quizQuestions.include.question` + `orderBy.order`
- Favorites: `isFavorite` boolean on Question; `lib/actions/questions.ts` toggles it and removes questions from a quiz

### 3. Polymorphic Evaluations

`Evaluation` entity supports two patterns:

- **Interview evals** (quiz-based): `interviewId` 1:1 relationship + answers → fit score + quiz score
- **Candidate evals** (resume-based): `candidateId` + `positionId` many-to-one → fit score + recommendation
- Interview evaluation: `lib/services/interview-evaluation.ts` (answers and score are read and computed on the server), called by `lib/actions/evaluations.ts`
- Resume evaluation: `lib/services/resume-evaluation.ts`, streamed by `app/api/evaluations/stream/route.ts`
- Notes, hiring notes, delete: `lib/actions/evaluation-entity.ts`

### 4. AI Quiz Generation Flow

1. In the quiz editor, the user opens the generation dialog (`components/quiz/quiz-generation-form.tsx`)
2. Calls `generateNewQuizAction()` from `lib/actions/quizzes.ts`
3. AI service builds prompts in `lib/services/ai/prompts.ts` (system message enforces Italian)
4. Calls `aiQuizService.generateQuiz()` → `generateStructured()` validates with `aiQuizGenerationSchema` (Zod)
5. The questions replace the editor content as **unsaved changes** — nothing is written yet
6. The user reviews them and presses Save → `upsertQuizAction()` stores quiz + questions

**Language rule:** All quiz/question text is in **Italian**. System prompts in `lib/services/ai/core.ts` enforce this.

### 5. Preset-Driven Generation

`Preset` entity defines question generation templates:

- Fields: `focusAreas`, `distractorComplexity`, `language`, `bugType`, `codeComplexity`, `expectedResponseLength`, etc.
- Usage: fetch `getPresetData(presetId)`, pass parameters to `aiQuizService.generateQuestions()`
- Types: multiple_choice, code_snippet, open_question

## Essential References

| What            | Where                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Authentication  | `lib/auth.ts` (config), `lib/auth-server.ts` (requireUser/getCurrentUser), note: **NO ownership filtering by createdBy**    |
| Action results  | `lib/actions/run-action.ts` (`runAction`, `UserError`), `lib/utils/action-result.ts` (`ActionResult`, `unwrap`, `errorMessage`) |
| Interview rules | `lib/utils/interview-utils.ts` (`interviewState`, `acceptsAnswers`, `getRemainingSeconds`) — shared by server and client  |
| AI models       | `lib/services/ai/models.ts` (`LLM_MODELS`, `getOptimalModel`, `FALLBACK_MODELS`) — safe to import from client components |
| AI service      | `lib/services/ai-service.ts` (re-exports), `lib/services/ai/core.ts` (main), `lib/services/ai/prompts.ts` (prompt builders) |
| Logging         | `lib/services/logger.ts` (use `aiLogger`, `storageLogger`, `authLogger`, `dbLogger` — avoid raw console)                    |
| Cache helpers   | `lib/utils/cache-utils.ts` (e.g., `invalidateQuizCache()`, `invalidateCandidateCache()`, `updateTag()`)                     |
| Validation      | `lib/schemas/` (Zod v4), key: `questionSchemas.strict` for runtime, `aiQuizGenerationSchema` for AI output                  |
| Question utils  | `lib/utils/question-utils.ts` (mapQuizQuestionsToFlexible, prepareQuestionForCreate)                                        |
| Dashboard shell | `app/dashboard/layout.tsx` (SidebarProvider, Breadcrumbs in Suspense), `components/dashboard/` (nav, sidebar, theme)        |
| Data layer      | `lib/data/quizzes.ts`, `lib/data/candidates.ts`, etc. (cached queries with cacheLife/cacheTag)                              |

## Developer Workflows

```bash
# Start dev server (Next.js MCP enabled for fast runtime diagnostics)
pnpm dev

# Database setup (local development)
pnpm db:push              # Push schema changes to Neon
pnpm db:generate          # Generate Prisma client
pnpm db:seed              # Seed sample data

# Production database
pnpm prisma migrate deploy

# Quality checks
pnpm build                # Full build
pnpm lint                 # ESLint check
pnpm test                 # Run tests
```

## Before Editing — Key Checklist

1. **Inspect the route first** — Read `layout.tsx`, `page.tsx`, and `error.tsx` for Suspense structure and caching decisions
2. **No ownership filtering** — All authenticated users can access all entities; don't filter by `createdBy`
3. **Data fetching location** — Prisma queries ONLY in server components; wrap runtime APIs in Suspense
4. **After mutations** — Call `updateTag(...)` for cache components (e.g., `updateTag('quizzes')`); avoid direct revalidatePath unless legacy
5. **Schemas first** — Before server action: validate input shape with Zod schema from `lib/schemas/`
6. **Test credentials ready** — Set `DATABASE_URL` and AI env vars (Groq API key) before running local actions
7. **Forms pair correctly** — Always use `react-hook-form` + Zod resolver from `lib/schemas/`, validate before calling server action

## Conventions

### Server actions

Every exported action has the same shape:

```ts
export async function updateThingAction(input: ThingInput) {
  return runAction("updateThingAction", async () => {
    const user = await requireUser();          // unless candidate-facing (see below)
    const data = thingSchema.parse(input);     // schema from lib/schemas
    // ... prisma calls; throw new UserError("Messaggio in italiano") for expected failures
    invalidateThingCache(...);                 // helper from lib/utils/cache-utils
    return { thingId };                        // merged into { success: true, ... }
  });
}
```

- **Never throw for an expected failure.** Thrown messages are replaced by a generic text in production; `runAction` turns `UserError`, Zod, quiz and AI errors into `{ success: false, error }` with an Italian message and logs anything unexpected.
- Inputs are typed objects. `FormData` only when a file is uploaded (candidate form, voice recording).
- `redirect()` inside `runAction` works as usual.
- **Candidate-facing actions** (`startInterview`, `submitAnswer`, `completeInterview`, `transcribeAudioAction`, `applyAsCandidate`, `fetchPositionData`) are public on purpose: the interview token is the credential. Everything else calls `requireUser()`.
- Reads for pages live in `lib/data/`, not in actions.

### Forms

- `react-hook-form` + `zodResolver(schema)` with the schema from `lib/schemas/` (never inline).
- Fields from `components/ui/rhf-inputs/`.
- `const [isPending, startTransition] = useTransition()`; submit inside `startTransition`.
- Handle the result with `unwrap()` + `try/catch`, or `if (!result.success) toast.error(result.error)`; feedback via `sonner` toasts; navigate with `router.push` (or a `redirect()` in the action).

### Interviews

- An interview that runs out of time ends as **completed**: the answers given count. Use `interviewState()` / `acceptsAnswers()` from `lib/utils/interview-utils.ts`, never re-compute expiry by hand.

## Styling Guidelines

- **Colors:** must use OKLCH format in CSS (see `app/globals.css`), e.g., `color: oklch(...)`
- **Utilities:** prefer Tailwind v4 classes; compose with `cn()`, `clsx()`, or `tailwind-merge`
- **Components:** reuse UI primitives from `components/ui/` and dashboard helpers from `components/dashboard/` instead of building new low-level components

## Documentation Requirements

**Mandatory for architectural changes:**

- `docs/AI_QUIZ_GENERATION.md` — AI service changes, prompt modifications, model selection updates
- `docs/CACHE_IMPLEMENTATION.md` — Cache patterns, cacheLife/cacheTag strategy changes
- `docs/QUESTION_SCHEMAS.md` — Schema changes, new question types, validation updates
- `README.md` — Major features, setup changes, new dependencies

## Common Patterns by Module

| Module                  | Example                                                                                    | Where                                        |
| ----------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Generate quiz           | form → `generateNewQuizAction()` → save questions via `QuizQuestion`                       | `lib/actions/quizzes.ts`, `components/quiz/` |
| Save quiz + questions   | `upsertQuizAction(input)` validates with `saveQuizSchema`                                  | `lib/actions/quizzes.ts`                     |
| Evaluate interview      | `evaluateInterviewAnswerAction()` per question → `completeInterviewEvaluationAction()`     | `lib/actions/evaluations.ts`                 |
| Evaluate candidate      | POST `/api/evaluations/stream` → streams and stores a resume-based Evaluation              | `app/api/evaluations/stream/route.ts`        |
| Upload resume           | Candidate form → `handleResumeUpload()` → Cloudflare R2 via `lib/services/r2-storage.ts`   | `components/candidates/candidate-form.tsx`   |
| Streaming position desc | Triggered from position form → `streamPositionDescription()` from AI service               | `lib/services/ai/streaming.ts`               |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
