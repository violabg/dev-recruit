# Copilot Instructions — DevRecruit

An AI-powered technical recruitment platform for generating quizzes, evaluating candidates, and managing interviews.

## Architecture at a Glance

| Layer            | Key Files                                                                     | Pattern                                                                         |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Routing**      | `app/dashboard/layout.tsx`, `app/dashboard/[section]/page.tsx`                | Next.js 16 App Router, server components by default                             |
| **Data queries** | `lib/data/*.ts`                                                               | `"use cache"` + `cacheLife()` + `cacheTag()` for cache components               |
| **Mutations**    | `lib/actions/*.ts`                                                            | Server actions (`"use server"`) with Zod validation, `requireUser()` for auth   |
| **AI service**   | `lib/services/ai/` (core.ts, prompts.ts, retry.ts, streaming.ts, sanitize.ts) | Multi-model LLM generation, validation with Zod schemas, error retry logic      |
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

### 2. Reusable Questions via Join Table

Questions are now **database entities** linked to quizzes via `QuizQuestion` join table:

- Create/update questions: use `lib/actions/questions.ts` (e.g., `createQuestionAction`, `updateQuestionAction`)
- Link to quiz: use `addQuestionsToQuizAction()` which creates `QuizQuestion` records with ordering
- Fetch with ordering: see `lib/data/quizzes.ts` — loads with `quizQuestions.include.question` + `orderBy.order`
- Favorites: `isFavorite` boolean on Question entity

### 3. Polymorphic Evaluations

`Evaluation` entity supports two patterns:

- **Interview evals** (quiz-based): `interviewId` 1:1 relationship + answers → fit score + quiz score
- **Candidate evals** (resume-based): `candidateId` + `positionId` many-to-one → fit score + recommendation
- Creation: `lib/actions/evaluation-entity.ts`
- Candidate answer evaluation: `lib/actions/evaluations.ts`

### 4. AI Quiz Generation Flow

1. User fills form (position, difficulty, question types) in `components/quiz/`
2. Calls `generateNewQuizAction()` from `lib/actions/quizzes.ts`
3. AI service builds prompts in `lib/services/ai/prompts.ts` (system message enforces Italian)
4. Calls `aiQuizService.generateQuiz()` → validates with `aiQuizGenerationSchema` (Zod)
5. Returns structured JSON with title + questions array
6. Questions are saved to DB, linked via `QuizQuestion` join table

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
| Create question         | `createQuestionAction(params)` validates with `createQuestionSchema`                       | `lib/actions/questions.ts`                   |
| Evaluate interview      | fetch Interview + answers → call `evaluateInterviewAnswersAction()` → generates Evaluation | `lib/actions/evaluations.ts`                 |
| Evaluate candidate      | fetch resume text → call `evaluateCandidateAction()` → generates resume-based Evaluation   | `lib/actions/evaluations.ts`                 |
| Upload resume           | Candidate form → `handleResumeUpload()` → Cloudflare R2 via `lib/services/r2-storage.ts`   | `components/candidates/candidate-form.tsx`   |
| Streaming position desc | Triggered from position form → `streamPositionDescription()` from AI service               | `lib/services/ai/streaming.ts`               |
