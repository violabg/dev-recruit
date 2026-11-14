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
- **Candidate-facing actions** (`startInterviewAction`, `submitAnswerAction`, `completeInterviewAction`, `transcribeAudioAction`, `applyAsCandidateAction`, `fetchPositionDataAction`) are public on purpose: the interview token is the credential. Everything else calls `requireUser()`.
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
- **Status colours:** use the theme tokens `success`, `warning`, `destructive`, `primary` and, for interview states, `stage-pending` / `stage-progress` / `stage-done` / `stage-cancelled` (e.g. `bg-success/10 text-success`). Never Tailwind palette classes (`text-green-600`) or hex values: tokens already adapt to dark mode, so no `dark:` colour overrides are needed.
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

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./node_modules/next/dist/docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command from this file's directory: npx @next/codemod agents-md --output AGENTS.md|01-app:{04-glossary.md}|01-app/01-getting-started:{01-installation.md,02-project-structure.md,03-layouts-and-pages.md,04-linking-and-navigating.md,05-server-and-client-components.md,06-fetching-data.md,07-mutating-data.md,08-caching.md,09-revalidating.md,10-error-handling.md,11-css.md,12-images.md,13-fonts.md,14-metadata-and-og-images.md,15-route-handlers.md,16-proxy.md,17-deploying.md,18-upgrading.md}|01-app/02-guides:{adopting-partial-prefetching.md,ai-agents.md,analytics.md,authentication-with-cache-components.md,authentication.md,backend-for-frontend.md,building.md,caching-without-cache-components.md,cdn-caching.md,ci-build-caching.md,content-security-policy.md,css-in-js.md,custom-server.md,data-security.md,debugging.md,deploying-to-platforms.md,draft-mode.md,environment-variables.md,forms.md,how-revalidation-works.md,incremental-static-regeneration-cache-components.md,incremental-static-regeneration.md,instant-navigation.md,instrumentation.md,interactive-apps.md,internationalization.md,json-ld.md,keeping-pages-static.md,lazy-loading.md,local-development.md,mcp.md,mdx.md,memory-usage.md,migrating-to-cache-components.md,multi-tenant.md,multi-zones.md,offline-support.md,open-telemetry.md,optimizing-prefetching.md,optimizing-the-static-shell.md,package-bundling.md,ppr-platform-guide.md,prefetching.md,preserving-ui-state.md,preventing-flash-before-hydration.md,production-checklist.md,progressive-web-apps.md,public-static-pages.md,redirecting.md,rendering-philosophy.md,sass.md,scripts.md,self-hosting.md,server-actions.md,server-and-client-boundary.md,single-page-applications.md,static-exports.md,streaming.md,tailwind-v3-css.md,third-party-libraries.md,videos.md,view-transitions.md}|01-app/02-guides/client-side-data-fetching:{swr.md,tanstack-query.md}|01-app/02-guides/migrating:{app-router-migration.md,from-create-react-app.md,from-vite.md}|01-app/02-guides/testing:{cypress.md,jest.md,playwright.md,vitest.md}|01-app/02-guides/upgrading:{agent-upgrade.md,codemods.md,version-14.md,version-15.md,version-16.md}|01-app/03-api-reference:{07-edge.md,08-turbopack.md}|01-app/03-api-reference/01-directives:{use-cache-private.md,use-cache-remote.md,use-cache.md,use-client.md,use-server.md}|01-app/03-api-reference/02-components:{font.md,form.md,image.md,link.md,script.md}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.md,manifest.md,opengraph-image.md,robots.md,sitemap.md}|01-app/03-api-reference/03-file-conventions/02-route-segment-config:{dynamicParams.md,ensureStatic.md,instant.md,maxDuration.md,preferredRegion.md,prefetch.md,runtime.md}|01-app/03-api-reference/03-file-conventions:{default.md,dynamic-routes.md,error.md,forbidden.md,instrumentation-client.md,instrumentation.md,intercepting-routes.md,layout.md,loading.md,mdx-components.md,middleware.md,not-found.md,page.md,parallel-routes.md,proxy.md,public-folder.md,route-groups.md,route.md,src-folder.md,template.md,unauthorized.md}|01-app/03-api-reference/04-functions:{after.md,cacheLife.md,cacheTag.md,catchError.md,connection.md,cookies.md,draft-mode.md,fetch.md,forbidden.md,generate-image-metadata.md,generate-metadata.md,generate-sitemaps.md,generate-static-params.md,generate-viewport.md,headers.md,image-response.md,io.md,navigation.md,next-request.md,next-response.md,next-root-params.md,not-found.md,permanentRedirect.md,prefetch.md,redirect.md,refresh.md,revalidatePath.md,revalidateTag.md,unauthorized.md,unstable_cache.md,unstable_noStore.md,unstable_rethrow.md,updateTag.md,use-link-status.md,use-offline.md,use-params.md,use-pathname.md,use-report-web-vitals.md,use-router.md,use-search-params.md,use-selected-layout-segment.md,use-selected-layout-segments.md,use-server-inserted-html.md,userAgent.md}|01-app/03-api-reference/05-config/01-next-config-js:{adapterPath.md,agentFeedback.md,agentRules.md,agentUpgrade.md,allowedDevOrigins.md,appDir.md,assetPrefix.md,authInterrupts.md,basePath.md,cacheComponents.md,cacheHandlers.md,cacheLife.md,cacheMaxMemorySize.md,compress.md,crossOrigin.md,cssChunking.md,deploymentId.md,devIndicators.md,distDir.md,enablePrerenderSourceMaps.md,env.md,expireTime.md,exportPathMap.md,exposeTestingApiInProductionBuild.md,generateBuildId.md,generateEtags.md,headers.md,htmlLimitedBots.md,httpAgentOptions.md,images.md,incrementalCacheHandlerPath.md,inlineCss.md,instrumentationClientInject.md,logging.md,mdxRs.md,onDemandEntries.md,optimizePackageImports.md,output.md,outputHashSalt.md,pageExtensions.md,partialPrefetching.md,poweredByHeader.md,prefetchInlining.md,productionBrowserSourceMaps.md,proxyClientMaxBodySize.md,reactCompiler.md,reactMaxHeadersLength.md,reactStrictMode.md,redirects.md,rewrites.md,sassOptions.md,serverActions.md,serverComponentsHmrCache.md,serverExternalPackages.md,skipProxyUrlNormalize.md,skipTrailingSlashRedirect.md,staleTimes.md,staticGeneration.md,supportsImmutableAssets.md,taint.md,trailingSlash.md,transpilePackages.md,turbopack.md,turbopackChunking.md,turbopackFileSystemCache.md,turbopackGc.md,turbopackIgnoreIssue.md,turbopackLazyDynamicImports.md,turbopackLazyDynamicImportsSSR.md,turbopackLocalPostcssConfig.md,turbopackMemoryEviction.md,turbopackPluginRuntimeStrategy.md,turbopackRustReactCompiler.md,typedRoutes.md,typescript.md,urlImports.md,useLightningcss.md,useOffline.md,useTypeScriptCli.md,webVitalsAttribution.md,webpack.md}|01-app/03-api-reference/05-config:{02-typescript.md,03-eslint.md}|01-app/03-api-reference/06-cli:{create-next-app.md,next.md}|01-app/03-api-reference/07-adapters:{01-configuration.md,02-creating-an-adapter.md,03-api-reference.md,04-testing-adapters.md,05-routing-with-next-routing.md,06-implementing-ppr-in-an-adapter.md,07-runtime-integration.md,08-invoking-entrypoints.md,09-output-types.md,10-routing-information.md,11-use-cases.md,12-immutable-static-assets.md}|02-pages/01-getting-started:{01-installation.md,02-project-structure.md,04-images.md,05-fonts.md,06-css.md,11-deploying.md}|02-pages/02-guides:{analytics.md,authentication.md,babel.md,ci-build-caching.md,content-security-policy.md,css-in-js.md,custom-server.md,debugging.md,draft-mode.md,environment-variables.md,forms.md,incremental-static-regeneration.md,instrumentation.md,internationalization.md,lazy-loading.md,mdx.md,multi-zones.md,open-telemetry.md,package-bundling.md,post-css.md,preview-mode.md,production-checklist.md,redirecting.md,sass.md,scripts.md,self-hosting.md,static-exports.md,tailwind-v3-css.md,third-party-libraries.md}|02-pages/02-guides/migrating:{app-router-migration.md,from-create-react-app.md,from-vite.md}|02-pages/02-guides/testing:{cypress.md,jest.md,playwright.md,vitest.md}|02-pages/02-guides/upgrading:{codemods.md,version-10.md,version-11.md,version-12.md,version-13.md,version-14.md,version-15.md,version-16.md,version-9.md}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.md,02-dynamic-routes.md,03-linking-and-navigating.md,05-custom-app.md,06-custom-document.md,07-api-routes.md,08-custom-error.md}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.md,02-static-site-generation.md,04-automatic-static-optimization.md,05-client-side-rendering.md}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.md,02-get-static-paths.md,03-get-server-side-props.md,05-client-side.md}|02-pages/03-building-your-application/06-configuring:{12-error-handling.md}|02-pages/04-api-reference:{06-edge.md,08-turbopack.md}|02-pages/04-api-reference/01-components:{font.md,form.md,head.md,image-legacy.md,image.md,link.md,script.md}|02-pages/04-api-reference/02-file-conventions:{instrumentation.md,proxy.md,public-folder.md,src-folder.md}|02-pages/04-api-reference/03-functions:{catchError.md,get-initial-props.md,get-server-side-props.md,get-static-paths.md,get-static-props.md,next-request.md,next-response.md,use-params.md,use-report-web-vitals.md,use-router.md,use-search-params.md,userAgent.md}|02-pages/04-api-reference/04-config/01-next-config-js:{adapterPath.md,allowedDevOrigins.md,assetPrefix.md,basePath.md,bundlePagesRouterDependencies.md,compress.md,crossOrigin.md,deploymentId.md,devIndicators.md,distDir.md,enablePrerenderSourceMaps.md,env.md,exportPathMap.md,generateBuildId.md,generateEtags.md,headers.md,httpAgentOptions.md,images.md,logging.md,onDemandEntries.md,optimizePackageImports.md,output.md,pageExtensions.md,poweredByHeader.md,productionBrowserSourceMaps.md,proxyClientMaxBodySize.md,reactStrictMode.md,redirects.md,rewrites.md,serverExternalPackages.md,skipProxyUrlNormalize.md,skipTrailingSlashRedirect.md,trailingSlash.md,transpilePackages.md,turbopack.md,turbopackChunking.md,typescript.md,urlImports.md,useLightningcss.md,useTypeScriptCli.md,webVitalsAttribution.md,webpack.md}|02-pages/04-api-reference/04-config:{01-typescript.md,02-eslint.md}|02-pages/04-api-reference/05-cli:{create-next-app.md,next.md}|02-pages/04-api-reference/06-adapters:{01-configuration.md,02-creating-an-adapter.md,03-api-reference.md,04-testing-adapters.md,05-routing-with-next-routing.md,06-runtime-integration.md,07-invoking-entrypoints.md,08-output-types.md,09-routing-information.md,10-use-cases.md}|03-architecture:{accessibility.md,fast-refresh.md,nextjs-compiler.md,supported-browsers.md}|04-community:{01-contribution-guide.md,02-rspack.md}<!-- NEXT-AGENTS-MD-END -->

<!-- agentic-system:start -->
# dev-recruit Agentic System

Route the current request through this file, then load only what that request needs. Keep this file under 80 lines: it is a router, not a knowledge base.

## Roles

Started by the developer, each as the main conversation of its session:

- `orchestrator` — drives one workflow the developer chooses explicitly: `DESIGN`, `FAST_IMPLEMENTATION` or `DOCUMENTATION`. In `DESIGN` it never writes production code; in `FAST_IMPLEMENTATION` it implements the requirement itself.
- `ask` — answers project and programming questions; never implements.
- `knowledge-builder` — builds and updates project knowledge.

Started only by the orchestrator, each in a fresh context with only its prompt, reporting back in the same conversation:

- `explorer`, `code-implementor`, `design-verifier`, `implementation-verifier`, `documentation-reviewer`.

Full role contracts live in `.claude/agents (Claude Code), .opencode/agents (OpenCode), .github/agents (GitHub Copilot in VS Code)`. Do not restate them here.

## Runtime

Every `#capability:<token>` in a role, skill or workflow instruction is an operation of the agentic system runtime or of an approved integration, bound for this repository. Runtime operations run as `node agentic-system/bin/agentic-system.mjs <token>`; pass large payloads with `--json <file>`. The JSON payload is the operation's argument object, defined in `agentic-system/contracts/`: design operations take `{ "sessionId", "jobId", "request": { ... } }`, and fields such as `operation`, `rows` and `ids` go inside `request`; every other operation takes its arguments at the top level. Your role file lists the arguments of each command, and an instruction defines the design writes it names, so do not probe a command first; run it with `--help` only when a call is refused. A refused design write is kept: correct it with the `draft` its refusal names instead of sending it again, and change text inside a stored field with `edit` instead of resending the field. A long answer arrives in parts: when it ends with `[part N of M. The answer continues: …]`, make the call it names and read every part before acting on any of it. Run one runtime operation per shell command: never join two calls with `;`, `&&` or a loop, and never pipe an answer through `head`, `tail`, `cut`, `sed` or `dd`.

- Session memory, the event log and artifacts are the session files under `agentic-system-sessions/<sessionId>/`, never the client's own memory feature.
- Workflow instructions are served one at a time by the runtime. Never open `agentic-system/workflows/` directly.
- Never edit runtime-owned files by hand: designs, jobs and integrity seals change only through runtime operations.
- A delegate that returns its report is never a stop point: continue the active instruction.
- When your context was compacted or the session was resumed in the middle of a job, what you read earlier is gone: before you continue, read your role file again, get the active instruction with `#capability:workflow-step-pending`, and read again with `#capability:knowledge-read` the knowledge the design cites.

## Skills

Repository skills live in `.agents/skills (workflow skills), .claude/skills (Claude Code role skills)`. Read a skill's `SKILL.md` before running its workflow.

## Knowledge

- Read the knowledge catalogue with `#capability:knowledge-catalog`. Every `MustHave` document is read in full; `PerContext` and `PerComponent` documents are read when the work touches them.
- Knowledge documents live in `knowledge`. Resolve repository vocabulary in `CONTEXT.md`.
- Only `knowledge-builder` changes knowledge. No workflow and no delegate creates, edits or deletes a file in `knowledge`, in a correction round either. A knowledge statement the work made stale is never fixed in place: report it to the developer, who takes it to `knowledge-builder`.

## Validation

Validate every change with `pnpm lint && pnpm test:run && pnpm build` before handing work back.
<!-- agentic-system:end -->
