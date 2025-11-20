# Tasks: Migrate from Shadcn Form to Field

## Overview

This document outlines the implementation tasks for migrating the project's form components from using the Shadcn UI Form wrapper to individual Field components. The migration aims to provide better field-level control and improve the overall form handling architecture.

## Implementation Strategy

**MVP First**: Start with migrating a single form component (login-form.tsx) to validate the approach, then incrementally migrate remaining forms.

**Incremental Delivery**: Each form migration is independently testable, allowing for gradual rollout and validation.

**Parallel Execution**: Form migrations can be executed in parallel since they are independent components.

## Dependencies

- All migration tasks (T003-T013) depend on the audit completion (T002)
- Polish tasks depend on all migration tasks completion

## Parallel Execution Examples

**Per Story (Form Migration)**:

- Developer A migrates auth forms (login, signup, forgot-password)
- Developer B migrates position forms (new-position, edit-position)
- Developer C migrates quiz and interview forms

## Phase 1: Setup Tasks

- [x] T001 Create migration checklist in specs/1-migrate-shadcn-form-field/checklists/migration.md

## Phase 2: Foundational Tasks

- [x] T002 Audit all Form component usages in codebase and update migration checklist

## Phase 3: Form Migration

**Story Goal**: Successfully migrate all form components to use Field components instead of Form wrapper for better field-level control and validation handling.

**Independent Test Criteria**:

- Form component compiles without errors
- Field validation works as expected
- Form submission behavior remains unchanged
- No visual regressions in form UI
- Accessibility features preserved

**Implementation Tasks**:

- [x] T003 [P] [US1] Migrate login form in components/auth/login-form.tsx
- [x] T004 [P] [US1] Migrate signup form in components/auth/sign-up-form.tsx
- [x] T005 [P] [US1] Migrate forgot password form in components/auth/forgot-password-form.tsx
- [x] T006 [P] [US1] Migrate update password form in components/auth/update-password-form.tsx
- [x] T007 [P] [US1] Migrate new position form in components/positions/new-position-form.tsx
- [x] T008 [P] [US1] Migrate edit position form in components/positions/edit-position-form.tsx
- [x] T009 [P] [US1] Migrate quiz selection form in components/quiz/quiz-selection-form.tsx
- [x] T010 [P] [US1] Migrate quiz form in app/dashboard/positions/[id]/quiz/new/QuizForm.tsx
- [x] T011 [P] [US1] Migrate candidate selection form in components/interview/candidate-selection-form.tsx
- [ ] T012 [P] [US1] Migrate edit quiz form in app/dashboard/quizzes/[id]/edit/components/edit-quiz-form.tsx
- [ ] T013 [P] [US1] Migrate AI quiz generation dialog in app/dashboard/quizzes/[id]/edit/components/ai-quiz-generation-dialog.tsx
- [ ] T014 [P] [US1] Migrate AI question generation dialog in app/dashboard/quizzes/[id]/edit/components/ai-question-generation-dialog.tsx

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T015 Remove unused Form imports across all migrated components
- [ ] T016 Update component documentation to reflect Field usage patterns
- [ ] T017 Run full form functionality tests across all migrated components
- [ ] T018 Update migration checklist with completion status
