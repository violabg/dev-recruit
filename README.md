# Dev Recruit

An AI-powered recruitment platform built with Next.js, Prisma, and Groq AI.

## Development Guides

### Type Safety

- **[TYPE_STRATEGY.md](./docs/TYPE_STRATEGY.md)** - Guide for when to use Prisma types vs custom types. Essential reading for maintaining type safety and preventing type drift.

### Caching & Performance

- **[CACHE_IMPLEMENTATION.md](./docs/CACHE_IMPLEMENTATION.md)** - Implementation guide for Cache Components, cacheLife directives, and cache invalidation patterns.

### Design System

- **[VISION_PRO_STYLE_GUIDE.md](./docs/VISION_PRO_STYLE_GUIDE.md)** - UI/UX guidelines for Vision Pro glass design, OKLCH tokens, and component styling.

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 16 (App Router, Cache Components)
- **Database**: Neon PostgreSQL (with Prisma)
- **AI**: Groq API (for quiz generation)
- **Authentication**: Better Auth
- **UI Components**: shadcn/ui
- **Forms**: React Hook Form + Zod
- **Styling**: Tailwind CSS v4

### Key Layers

- **`app/`**: Server components and routes
- **`lib/`**: Business logic (actions, data queries, services)
- **`components/`**: Reusable UI components
- **`docs/`**: Architecture and development guides

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Neon PostgreSQL database
- Groq API key

### Installation

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Setup database
pnpm prisma db push

# Start dev server
pnpm dev
```

### Running Commands

- **Dev server**: `pnpm dev` (with Next.js MCP enabled)
- **Build**: `pnpm build`
- **Lint**: `pnpm lint`
- **Database**: `pnpm prisma db push` (local) or `pnpm prisma migrate deploy` (prod)

## Constitutional Compliance

This project adheres to 10 core principles documented in [`.specify/memory/constitution.md`](./.specify/memory/constitution.md):

1. Cache Components First
2. Zod Validation (Non-Negotiable)
3. Server Actions + Prisma with Auth Guards
4. Type-Safe AI Integration with Retries & Timeouts
5. Data Queries in `lib/data/` Only
6. Suspense Fallbacks Using shadcn Skeleton
7. **Prisma Types Over Custom Types** (see [TYPE_STRATEGY.md](./docs/TYPE_STRATEGY.md))
8. DRY: Avoid Code Duplication
9. useTransition for Form Pending States
10. Component Reuse Before Creation

**Compliance Score**: 100% ✅

## Code Review Checklist

Before submitting a PR:

- [ ] All server actions have `requireUser()` guards
- [ ] Data queries are in `lib/data/` with `"use cache"` + `cacheLife()`
- [ ] Form components use `useTransition` (not `useState`)
- [ ] Custom types follow [TYPE_STRATEGY.md](./docs/TYPE_STRATEGY.md)
- [ ] Suspense boundaries have skeleton fallbacks
- [ ] AI outputs validated with Zod schemas
- [ ] No code duplication (reuse helpers from `lib/`)
- [ ] Build passes: `pnpm build`
- [ ] Lint passes: `pnpm lint`

## Contributing

All contributions must follow the Constitutional principles. See development guides above for specific patterns and best practices.

## License

[Your License Here]
