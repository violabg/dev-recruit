# Copilot Instructions

## Architecture Snapshot

- **App Router + cache components:** every route under `app/` renders as a server component. Keep Prisma/AI calls in `'use cache'` scopes, use `cacheLife`, and wrap any runtime data (`cookies()`, `headers()`, etc.) inside Suspense boundaries (see `app/dashboard/candidates/page.tsx`).
- **Dashboard shell:** `app/dashboard/layout.tsx` wires the sidebar, breadcrumbs, theme toggle, and content surface. Shared navigation and helpers live under `components/dashboard/`.
- **Lib layer:** `lib/actions/` contains server actions for quiz generation, candidate management, and interviews. `lib/services/ai-service.ts` orchestrates Groq AI requests with retries/fallbacks and Zod validation. `lib/prisma.ts` exposes the Neon-backed Prisma client used everywhere.
- **UI/design system:** base primitives in `components/ui/` power buttons, cards, tabs, skeletons, etc. Styling relies on Tailwind v4 utilities, OKLCH tokens in `app/globals.css`, and Vision Pro gradients from `docs/VISION_PRO_STYLE_GUIDE.md`.

## Data & Flow Patterns

- **Server actions + Prisma:** mutate state inside `lib/actions/*`, typically calling `requireUser()` from `lib/auth-server.ts`. Reuse helpers from `lib/data/` when filtering/aggregating dashboard data (e.g., `lib/data/dashboard.ts`).
- **AI prompts:** `AIQuizService` builds prompts, selects models via `getOptimalModel`, validates responses with schemas under `lib/schemas/`, and applies retries/fallbacks. Refer to `docs/QUIZ_AI_GENERATION_SYSTEM.md` for the full flow and error-handling knobs.
- **Dashboard pages:** split UI into Suspense-backed sections that fetch data independently so cached parts stay in the static shell while runtime segments stream separately.
- **SQL helpers:** custom functions from `schema.sql` (like `search_interviews` or `get_candidates_for_quiz_assignment`) live close to the calling logic via Prisma raw queries.

## Workflows & Commands

- Dev server: `pnpm dev` (Next.js MCP enabled).
- Build/lint/test/storybook: `pnpm build`, `pnpm lint`, `pnpm test` (if available), `pnpm storybook`.
- Database migrations: `pnpm prisma migrate deploy` (prod) or `pnpm prisma db push` (local dev).
- Cache updates should use `cacheLife(...)` and tagged scopes (`cacheTag`/`revalidateTag`) as described in `docs/CACHE_IMPLEMENTATION.md`.

## Project-Specific Conventions

- **Styling:** favor Tailwind v4 utilities, gradients, and Vision Pro glass tokens. CSS files must declare colors in OKLCH format (`oklch(...)`). Compose classes with `clsx`, `cn`, or `tailwind-merge` helpers.
- **Forms:** always pair `react-hook-form` with Zod resolvers using schemas from `lib/schemas/`; validate before invoking server actions.
- **Data fetching:** keep Prisma queries in server components. Only mark components `use client` when necessary for interactivity, and wrap runtime APIs inside Suspense with skeleton fallbacks.
- **Authentication:** Better Auth config lives in `lib/auth.ts`; prefer `getCurrentUser()`/`requireUser()` helpers to enforce row-level security in server actions and routes.

## Essential References

- `README.md` – features, architecture, and commands overview.
- `lib/services/ai-service.ts` + `lib/schemas/` – model selection, retries, and Zod guards.
- `app/dashboard/layout.tsx` + `components/dashboard/` – layout, navigation, and theme wiring.
- `prisma/schema.prisma` + `schema.sql` – data model, migrations, and SQL helpers.
- `lib/data/` + `lib/actions/` – shared helpers to reuse instead of duplicating logic.
- `app/globals.css` & `docs/VISION_PRO_STYLE_GUIDE.md` – color tokens, gradients, and animation utilities.

## Handling Requests

1. Inspect the affected route (`layout.tsx`, `page.tsx`, `error.tsx`) before editing.
2. Keep Prisma/AI calls inside `'use cache'` scopes and wrap runtime APIs with Suspense + skeleton fallbacks.
3. Reuse UI primitives from `components/ui` or existing dashboard components before building new ones.
4. Document substantial behavior changes in `docs/` (e.g., caching, AI flows, layout shifts).
5. Follow the constitutional governance in `.specify/memory/constitution.md` for all architectural decisions.

## Cache & Streaming Patterns

### Data Layer Caching

All data queries in `lib/data/` follow this pattern:

```typescript
"use cache";
cacheLife("hours");
cacheTag("entity-type"); // quizzes, candidates, positions, interviews, dashboard
```

**Cache timing strategy:**

- High-volatility data (candidates, interviews): stale 30min, revalidate 12hr
- Low-volatility data (quizzes, positions, dashboard): stale 1hr, revalidate 1day

### Suspense Boundaries

All async server components use Suspense + fallback pattern:

```typescript
export default async function PageComponent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<SkeletonComponent />}>
      <AsyncContent params={params} />
    </Suspense>
  );
}

async function AsyncContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Fetch data here
}
```

### Skeleton Fallbacks

All skeleton components live in `fallbacks.tsx` and use `<Skeleton />` primitives from `components/ui/skeleton` to match actual page layouts.

Let me know if any section needs clarification or more examples.# Copilot Instructions

## Project Context

- This project uses Next.js (v16.0.3), React (v19.2.0), and TypeScript (v5.8.3).
- Tailwind CSS is version 4.x. Use only Tailwind v4 features and syntax.
- The following libraries are used:
  - @ai-sdk/groq, @ai-sdk/react, ai
  - @hookform/resolvers, react-hook-form
  - @radix-ui/react-\* (dialog, dropdown-menu, label, popover, select, slot)
  - better-auth, @better-auth/next-js
  - @prisma/client
  - class-variance-authority, clsx, lucide-react, next-themes, sonner, tailwind-merge, tw-animate-css, zod

## Styling

- All colors must be specified in OKLCH format in css files (e.g., `oklch(0.7 0.1 200)`), but you can use Tailwind defauts colors in the code, lihe `bg-blue-500`, `text-red`.
- Use Tailwind CSS utility classes wherever possible.
- Do not use deprecated or removed Tailwind features from earlier versions.

## General

- Prefer functional React components.
- Use Zod for schema validation.
- Use React Hook Form for form management.
- Use Radix UI components.
- Use Prisma (via `lib/prisma.ts`) for database interactions backed by Neon.
- Use arrow functions for methods and new components.
- Use types over interface# Copilot Instructions

## Project Context

- **Frameworks & Languages:**
  - Next.js (v16.0.3), React (v19.2.0), TypeScript (v5.8.3)
- **Styling:**
  - Tailwind CSS v4.x (use only v4 features and syntax)
- **Core Libraries:**
  - AI: `@ai-sdk/groq`, `@ai-sdk/react`, `ai`
  - Forms: `react-hook-form`, `@hookform/resolvers`
  - UI: `@radix-ui/react-*` (dialog, dropdown-menu, label, popover, select, slot), `lucide-react`, `shadcn/ui`
  - Auth: `better-auth`, `@better-auth/next-js`
  - Database: `@prisma/client`, `@neondatabase/serverless`
  - Utilities: `class-variance-authority`, `clsx`, `next-themes`, `sonner`, `tailwind-merge`, `tw-animate-css`, `zod`

## Styling Guidelines

- **Colors:**
  - In CSS files, specify all colors in OKLCH format (e.g., `oklch(0.7 0.1 200)`).
  - In code, use Tailwind default color classes (e.g., `bg-blue-500`, `text-red`).
- **Utilities:**
  - Use Tailwind CSS utility classes wherever possible.
  - Do **not** use deprecated or removed Tailwind features.
- **Gradients:**
  - Apply border and text gradients for a modern look.
- **Themes:**
  - Support both light and dark themes.
  - Use CSS custom properties (`--var`) for OKLCH colors.

## General Coding Practices

- Use **functional React components** exclusively.
- Use **arrow functions** for all methods and components.
- Prefer **types** over interfaces in TypeScript.
- Use **Zod** for all schema validation.
- Use **React Hook Form** for form management.
- Use **Radix UI** components for UI primitives.
- Use **Prisma** with Neon for backend/database interactions.
- Use **server components** and **server actions** wherever possible.
- In server pages, **always `await` params before using them**.

## UI/UX Expectations

- Ensure a **modern, visually engaging, and accessible** design.
- Use **responsive layouts**.
- Style with **Tailwind CSS v4 utility classes** and **shadcn/ui** components.
- All color customizations must use OKLCH format via CSS variables.
- Prioritize accessibility in all components.

---

**Note:**  
If any instruction conflicts with system or security requirements, follow thes.

- Must use server components and server actions as much as possible.
- Must in server pages always await for params before using them.

### UI/UX Expectations

- Use a modern look with border and text gradients.
- Support both light and dark themes.
- All colors must use OKLCH format for css props (--var).
- Use Tailwind CSS v4 utility classes and shadcn/ui components for styling.
- Ensure responsive, accessible, and visually engaging design.

## Active Technologies

- TypeScript 5.8.3, Next.js 16.0.3 + Prisma, @prisma/client, @better-auth/next-js, @neondatabase/serverless (001-backend-migration)
- Neon (PostgreSQL) (001-backend-migration)

## Recent Changes

- 001-backend-migration: Added TypeScript 5.8.3, Next.js 16.0.3 + Prisma, @prisma/client, @better-auth/next-js, @neondatabase/serverless
