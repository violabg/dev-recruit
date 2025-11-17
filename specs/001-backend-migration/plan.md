# Implementation Plan: Backend Migration to Prisma + Neon + Better Auth

**Branch**: `001-backend-migration` | **Date**: 2025-11-14 | **Spec**: /specs/001-backend-migration/spec.md
**Input**: Feature specification from `/specs/001-backend-migration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Migrate backend from Supabase to Prisma + Neon + Better Auth while maintaining all functionalities. Technical approach: Incremental phased migration (auth → positions → candidates → quizzes) with Supabase fallback to keep app operational during development.

## Technical Context

**Language/Version**: TypeScript 5.8.3, Next.js 16.0.2
**Primary Dependencies**: Prisma, @prisma/client, @better-auth/next-js, @neondatabase/serverless  
**Storage**: Neon (PostgreSQL)  
**Testing**: None (per constitution v2.0.0)  
**Target Platform**: Web application (Next.js)  
**Project Type**: Web application  
**Performance Goals**: Maintain current response times (<2s for queries)  
**Constraints**: Keep app functional during migration, use Supabase as fallback until complete  
**Scale/Scope**: Incremental migration: Phase 1 auth, Phase 2 positions, Phase 3 candidates, Phase 4 quizzes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Constitution-aligned gates (must be validated for Phase 0 completion):

- AI Safety & Validation: PASS - Migration preserves existing Zod schemas and validation for AI-generated content.
- Schema Safety: PASS - Maintains Zod schemas, migrates database schema to Prisma schema with validation.
- Security & Data Isolation: PASS - Better Auth provides secure authentication, Prisma handles data access with proper isolation.
- Versioning: PASS - Migration is internal infrastructure change, no public contract modifications.
- Accessibility & UI Tokens: N/A - No UI changes in this migration plan.

## Project Structure

### Documentation (this feature)

```text
specs/001-backend-migration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

Existing Next.js app structure:

- `lib/supabase/` - Current Supabase client and queries (to be migrated)
- `lib/actions/` - Server actions using Supabase
- `app/api/` - API routes using Supabase
- `components/` - UI components
- `lib/schemas/` - Zod schemas (preserve)

**Structure Decision**: Migration within existing structure, gradually replacing Supabase with Prisma/Better Auth while maintaining functionality.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
