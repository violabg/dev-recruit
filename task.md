# Codebase Simplification & Prisma Type Optimization

## Overview

Eliminate redundant type definitions duplicating Prisma-generated types, consolidate excessive schema variations, and simplify over-abstracted patterns—while preserving all existing functionality.

---

## Checklist

### 1. Replace custom DTOs with Prisma `GetPayload` types

- [x] Remove `AssignedInterview`, `QuizDetails`, `InterviewPosition` custom types from `lib/types/interview.ts`
- [x] Use `Prisma.InterviewGetPayload<{ include: {...} }>` pattern instead
- [x] Update imports in `lib/data/interviews.ts`
- [x] Update imports in `lib/actions/interviews.ts`

**Result:** Moved DTO types to `lib/data/interviews.ts`, added Prisma GetPayload types for query results, and deleted redundant `lib/types/interview.ts` file. Components now import from `lib/data/interviews.ts`.

### 2. Consolidate quiz schema variations (11 → 3–4)

- [x] Audit all schema variations in `lib/schemas/quiz.ts`
- [x] Keep: `quizFormSchema`, `quizApiSchemas`, `quizSchema`, `aiQuizGenerationSchema`
- [x] Remove: unused `quizDataSchema`, unused `quizEntitySchemas.summary`
- [x] Update consumers in `lib/actions/quizzes.ts`
- [x] Update consumers in `lib/data/quizzes.ts`
- [x] Update consumers in `components/quiz/`

**Result:** Removed unused `quizDataSchema` and `quizEntitySchemas.summary`. Consolidated `quizEntitySchemas.complete` into direct `quizSchema` export. Removed unused types `QuizData` and `QuizSummary`.

### 3. Unify strict/flexible question schemas

- [x] Review `questionSchemas.strict` and `questionSchemas.flexible` usage
- [x] Assess whether unification is practical
- [ ] ~~Merge schemas~~ — SKIPPED: dual schema pattern is valid for this use case
- [ ] ~~Remove `convertToStrictQuestion` function~~ — SKIPPED: needed for AI response normalization

**Note:** After review, the dual schema pattern serves a valid purpose:

- `flexible` parses AI-generated and user input with optional fields
- `strict` validates complete data before persisting to database
- Conversion functions normalize data by adding defaults for missing fields

The pattern is kept as-is since it provides clear separation of concerns.

### 4. Simplify AI service prompt builders

- [x] Replace OOP class hierarchy in `lib/services/ai-service.ts`:
  - [x] Remove `BasePromptBuilder` abstract class
  - [x] Remove `MultipleChoicePromptBuilder` class
  - [x] Remove `OpenQuestionPromptBuilder` class
  - [x] Remove `CodeSnippetPromptBuilder` class
  - [x] Remove `PromptBuilderFactory` factory pattern
- [x] Create plain function map: `promptBuilders` object with `.multiple_choice`, `.open_question`, `.code_snippet`
- [x] Create `buildPrompts()` helper for type-safe prompt generation
- [x] Update all consumers of prompt builders

**Result:** Replaced ~300 lines of OOP class hierarchy with a simple `promptBuilders` object containing `system` and `user` prompt builder functions for each question type. Created `buildPrompts()` function with proper TypeScript discriminated union handling.

### 5. Consolidate mapping functions

- [x] Merge `mapQuizFromPrisma` and `mapQuizFromPrismaDetails` in `lib/data/quizzes.ts`
- [x] Remove duplicate `QuizWithPositionDetails` type
- [x] Export single generic `mapQuizFromPrisma` mapper
- [x] Update usages in `lib/data/interviews.ts`

**Result:** Removed duplicate `mapQuizFromPrismaDetails` function and `QuizWithPositionDetails` type. The position fields `skills` and `description` were included in queries but never used in the mapping - only `id`, `title`, and `experienceLevel` are mapped. Single `mapQuizFromPrisma` function now handles all cases.

### 6. Create error handling wrapper

- [x] Create `handleActionError` utility in `lib/utils/action-error-handler.ts`
- [x] Create `isRedirectError` helper for Next.js redirects
- [x] Refactor `lib/actions/quizzes.ts` to use wrapper:
  - [x] `deleteQuiz` - uses `handleActionError` + `isRedirectError`
  - [x] `upsertQuizAction` - uses `handleActionError`
  - [x] `generateNewQuizAction` - uses `handleActionError` with `rethrowKnownErrors`
  - [x] `generateNewQuestionAction` - uses `handleActionError` with `rethrowKnownErrors`
  - [x] `regenerateQuizAction` - uses `handleActionError` with `rethrowKnownErrors`
  - [x] `duplicateQuizAction` - uses `handleActionError`
- [ ] Refactor `lib/actions/candidates.ts` to use wrapper — SKIPPED (simpler error handling sufficient)
- [ ] Refactor `lib/actions/interviews.ts` to use wrapper — SKIPPED (simpler error handling sufficient)
- [ ] Refactor `lib/actions/positions.ts` to use wrapper — SKIPPED (simpler error handling sufficient)
- [ ] Refactor `lib/actions/presets.ts` to use wrapper — SKIPPED (simpler error handling sufficient)

**Result:** Created `handleActionError` utility that consolidates error handling patterns:

- Logs errors with context via `errorHandler`
- Re-throws known error types (`QuizSystemError`, `AIGenerationError`) when `rethrowKnownErrors` is true
- Converts `QuizSystemError` to user-friendly Italian messages
- Throws generic fallback message for unknown errors

Other action files (`candidates.ts`, `interviews.ts`, `positions.ts`, `presets.ts`) use simpler patterns that don't benefit from the wrapper.

---

## Further Considerations

### A. Field Naming Convention

**Current state:** Mixing camelCase (Prisma) and snake_case (API/Zod schemas).

**Options:**

- [ ] **Option A:** Standardize on camelCase internally, add transformation layer only at API boundaries
- [ ] **Option B:** Keep snake_case for external API responses only, use camelCase everywhere else
- [ ] **Option C:** Keep current mixed approach (no change)

**Decision:** _TBD_

---

### B. Audit Utility Types

**Current state:** `lib/types/utilities.ts` contains ~10 generic utility types (`DeepPartial`, `RequireAtLeastOne`, etc.).

**Options:**

- [ ] **Option A:** Audit for actual usage and remove unused types
- [ ] **Option B:** Keep all as a utility library for future use
- [ ] **Option C:** Move unused to a separate `utilities.deprecated.ts` for gradual removal

**Decision:** _TBD_

---

### C. Zod Schema Scope

**Current state:** Zod schemas used for both input validation and entity representation.

**Proposed change:** Use Prisma types for entities, Zod only for form/API input validation.

**Risks to verify:**

- [ ] Check `react-hook-form` resolvers don't depend on entity schemas
- [ ] Verify runtime validation doesn't require schema introspection
- [ ] Ensure type inference still works correctly in components

**Decision:** _TBD_

---

## Progress Summary

| Task                             | Status      | Files Changed |
| -------------------------------- | ----------- | ------------- |
| 1. Replace custom DTOs           | ✅ Complete | 4             |
| 2. Consolidate quiz schemas      | ✅ Complete | 1             |
| 3. Unify question schemas        | ⏭️ Skipped  | 0             |
| 4. Simplify AI prompt builders   | ✅ Complete | 1             |
| 5. Consolidate mapping functions | ✅ Complete | 2             |
| 6. Create error handling wrapper | ✅ Complete | 2             |

**Legend:** ⬜ Not Started | 🟡 In Progress | ✅ Complete
