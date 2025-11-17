# Implementation Plan: Upgrade to Next.js 16 and React 19 Compiler

**Branch**: `001-upgrade-next16` | **Date**: 2025-10-29 | **Spec**: ../spec.md
**Input**: Migration to Next.js 16 and React 19 compiler to modernize the build toolchain and unlock compiler improvements.

## Summary

Upgrade the application from Next.js 15 → Next.js 16 and move to the React 19 compiler. This plan covers dependency upgrades,
CI/tooling changes, local/dev ergonomics, staging and canary rollout, and a rollback path. The migration will be performed in a
phased manner with thorough CI validation and a migration guide.

## Technical Context

**Language/Version**: Node.js 20 (target), TypeScript (existing), React 19 (compiler)
**Primary Dependencies**: Next.js 16, React 19 compiler, Tailwind CSS v4.x (keep), @supabase/supabase-js (keep), @ai-sdk/groq (keep)
**Storage**: Supabase (no changes expected beyond runtime compatibility)
**Testing**: Existing unit/integration tests (Jest/Playwright/Storybook as used by repo)
**Target Platform**: Vercel (or Docker/runner for production), staging environment for validation
**Performance Goals**: No user-visible regression in core workflows; builds succeed in CI.
**Constraints**: Keep UI behavior identical; minimize runtime breaking changes; migrate dependencies where necessary.
**Scale/Scope**: Single web app (Next.js-based) — repository root changes only.

## Constitution Check

- AI Safety & Validation: N/A for migration (no AI prompt changes)
- Test-First: All contract/shape changes must include failing tests before implementation
- Security & Data Isolation: RLS and auth flows must be validated in staging
- Versioning: Migration is MAJOR (per spec) — update release notes and tagging
- Accessibility/UI tokens: No design token changes planned

## Project Structure

This is a focused repo-level migration: changes affect `package.json`, `.github/workflows/*`, `next.config.mjs`, `Dockerfile`, and CI scripts.

## Complexity Tracking

No additional projects added. Primary complexity arises from dependency incompatibilities and CI runtime changes.

\*\*\* End Plan
